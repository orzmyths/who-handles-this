import { and, eq } from "drizzle-orm";
import { db, contactSourceReviews } from "@workspace/db";
import { AGENCIES } from "./agency-data";
import { contactIsStale, contactSourceUrls } from "./agency-contacts";
import { fetchContactSource, type Observation } from "./contact-source-content";
import { listApprovedContacts } from "./approved-contact-store";

type Review = {
  revision: number;
  baselineText: string | null;
  baselineHash: string | null;
  baselineReviewedAt: string | null;
  observation: Observation | null;
  // Preserve a detected change through subsequent restricted/unavailable checks.
  candidate: Observation | null;
  history: { reviewedAt: string; reason: string; hash: string; reviewer?: string }[];
};
const namespace = process.env.STAFF_CASES_NAMESPACE ?? "default";
const empty = (): Review => ({
  revision: 0, baselineText: null, baselineHash: null, baselineReviewedAt: null,
  observation: null, candidate: null, history: [],
});

export const monitoredSources = () => [...new Set(AGENCIES.flatMap(a => contactSourceUrls(a.contactOptions)))];

async function load(url: string): Promise<Review> {
  const rows = await db.select().from(contactSourceReviews).where(and(
    eq(contactSourceReviews.namespace, namespace), eq(contactSourceReviews.sourceUrl, url),
  ));
  return rows[0] ? rows[0].data as Review : empty();
}

function entry(url: string, review: Review, records: Awaited<ReturnType<typeof listApprovedContacts>>) {
  const agencies = AGENCIES.map(a => ({ ...a, contactOptions: records.filter(c => c.agencyId === a.id).map(c => c.contact) }))
    .filter(a => contactSourceUrls(a.contactOptions).includes(url));
  const affectedContacts = agencies.flatMap(a => a.contactOptions
    .filter(c => c.sourceUrl === url || c.hoursSourceUrl === url)
    .map(c => ({ agencyName: a.name, label: c.label, value: c.value, hours: c.hours ?? null, note: c.note ?? null, lastReviewed: c.lastReviewed })));
  const overdue = agencies.some(a => a.contactOptions.some(c =>
    (c.sourceUrl === url || c.hoursSourceUrl === url) && contactIsStale(c)));
  const candidate = review.candidate;
  const changed = !!review.baselineHash && !!candidate && candidate.hash !== review.baselineHash;
  return {
    sourceUrl: url, agencyNames: agencies.map(a => a.name), revision: review.revision,
    status: changed ? "changed" : !review.baselineHash ? "baseline_needed" : overdue ? "overdue" : "current",
    accessStatus: review.observation?.status ?? "unchecked",
    detail: review.observation?.detail ?? "This source has not been checked yet.",
    checkedAt: review.observation?.checkedAt ?? null,
    baselineReviewedAt: review.baselineReviewedAt,
    overdue, affectedContacts,
    approvedContacts: records.filter(c => c.contact.sourceUrl === url || c.contact.hoursSourceUrl === url),
    baselineText: review.baselineText,
    candidateText: candidate?.text ?? null,
    canConfirm: !!candidate && review.observation?.status === "ok",
    history: review.history,
  };
}

export async function listContactSourceReviews() {
  const records = await listApprovedContacts();
  const urls = [...new Set([...monitoredSources(), ...records.flatMap(c => contactSourceUrls([c.contact]))])];
  return Promise.all(urls.map(async url => entry(url, await load(url), records)));
}

let checking: Promise<Awaited<ReturnType<typeof listContactSourceReviews>>> | null = null;
export function checkContactSources() {
  checking ??= runChecks().finally(() => { checking = null; });
  return checking;
}

async function runChecks() {
  // Serialize checks and manual confirmations across server and preflight processes.
  const client = await db.$client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(70318421)");
    for (const { sourceUrl: url } of await listContactSourceReviews()) {
      const review = await load(url);
      const observation = await fetchContactSource(url);
      review.observation = observation;
      if (observation.status === "ok") review.candidate = observation;
      review.revision++;
      await db.insert(contactSourceReviews).values({ namespace, sourceUrl: url, data: review })
        .onConflictDoUpdate({ target: [contactSourceReviews.namespace, contactSourceReviews.sourceUrl], set: { data: review } });
    }
    return await listContactSourceReviews();
  } finally {
    await client.query("SELECT pg_advisory_unlock(70318421)");
    client.release();
  }
}

export async function confirmContactSource(url: string, revision: number, reason: string, reviewer: string) {
  const client = await db.$client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(70318421)");
    const review = await load(url);
    if (review.revision !== revision || review.observation?.status !== "ok" || !review.candidate?.hash || !review.candidate.text) return null;
    review.baselineText = review.candidate.text;
    review.baselineHash = review.candidate.hash;
    review.baselineReviewedAt = new Date().toISOString();
    review.history = [{ reviewedAt: review.baselineReviewedAt, reason, hash: review.baselineHash, reviewer }, ...review.history].slice(0, 20);
    review.revision++;
    await db.update(contactSourceReviews).set({ data: review }).where(and(
      eq(contactSourceReviews.namespace, namespace), eq(contactSourceReviews.sourceUrl, url),
    ));
    // Baseline confirmation does not renew approved contacts or agency freshness.
    return entry(url, review, await listApprovedContacts());
  } finally {
    await client.query("SELECT pg_advisory_unlock(70318421)");
    client.release();
  }
}