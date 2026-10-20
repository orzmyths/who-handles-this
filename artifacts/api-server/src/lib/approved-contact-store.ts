import { eq } from "drizzle-orm";
import { db, approvedContacts } from "@workspace/db";
import type { ApprovedContactRecord, ApprovedContactCorrection } from "@workspace/api-zod";
import { AGENCIES } from "./agency-data";
import { isOfficialContactUrl } from "./agency-contacts";

const namespace = process.env.STAFF_CASES_NAMESPACE ?? "default";
export class ContactCorrectionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listApprovedContacts(): Promise<ApprovedContactRecord[]> {
  const rows = await db.select().from(approvedContacts).where(eq(approvedContacts.namespace, namespace));
  const saved = new Map(rows.map(row => [row.contactId, row.data as ApprovedContactRecord]));
  return AGENCIES.flatMap(agency => agency.contactOptions.map((contact, index) => {
    const contactId = `${agency.id}:${index}`;
    return saved.get(contactId) ?? {
      contactId, agencyId: agency.id, agencyName: agency.name, revision: 0,
      contact: { ...contact, reviewAfterDays: 180 as const }, history: [],
    };
  }));
}

// Return a request-local snapshot, not a mutable process cache. Other sessions and
// server processes see persisted corrections on their next request.
export async function getApprovedAgencies() {
  const records = await listApprovedContacts();
  return AGENCIES.map(agency => ({
    ...agency, contactOptions: records.filter(record => record.agencyId === agency.id).map(record => record.contact),
  }));
}

export async function correctApprovedContact(input: ApprovedContactCorrection, reviewer: string) {
  const client = await db.$client.connect();
  try {
    await client.query("BEGIN");
    // Same lock as automated checks and baseline confirmations.
    await client.query("SELECT pg_advisory_xact_lock(70318421)");
    const current = (await listApprovedContacts()).find(record => record.contactId === input.contactId);
    if (!current) throw new ContactCorrectionError(404, "Approved contact not found.");
    if (current.revision !== input.revision) throw new ContactCorrectionError(409, "Contact changed. Reopen and verify the current record.");
    const source = await client.query("SELECT data FROM contact_source_reviews WHERE namespace = $1 AND source_url = $2", [namespace, input.reviewedSourceUrl]);
    const sourceRevision = source.rows[0]?.data?.revision ?? 0;
    if (sourceRevision !== input.sourceRevision ||
      ![current.contact.sourceUrl, current.contact.hoursSourceUrl].includes(input.reviewedSourceUrl)) {
      throw new ContactCorrectionError(409, "Source review changed. Reopen and verify again.");
    }
    const label = input.label.trim(), value = input.value.trim(), sourceUrl = input.sourceUrl.trim();
    const hours = input.hours.trim(), hoursSourceUrl = input.hoursSourceUrl.trim(), note = input.note.trim();
    const reason = input.reason.trim();
    // Agency-specific provenance: an official page from another agency is not evidence.
    const allowedHosts = new Set(AGENCIES.find(a => a.id === current.agencyId)!.contactOptions
      .flatMap(c => [c.sourceUrl, ...(c.hoursSourceUrl ? [c.hoursSourceUrl] : [])]).map(url => new URL(url).hostname));
    if (allowedHosts.has("www.sanjoseca.gov")) allowedHosts.add("311.sanjoseca.gov");
    const validSource = (url: string) => isOfficialContactUrl(url) && allowedHosts.has(new URL(url).hostname);
    if (input.sourceVerified !== true || input.purposeVerified !== true || !label || !reason ||
      !validSource(sourceUrl) || (hoursSourceUrl && !validSource(hoursSourceUrl)) ||
      (!hours && !!hoursSourceUrl) ||
      (current.contact.kind === "phone" ? !/^\+1\d{10}$/.test(value) : !validSource(value))) {
      throw new ContactCorrectionError(400, "Verify the official agency source and purpose. Use a US phone number (+1 and ten digits) or an approved official HTTPS link.");
    }
    const reviewedAt = new Date().toISOString();
    const contact = {
      kind: current.contact.kind, label, value, sourceUrl,
      ...(hours ? { hours } : {}), ...(hoursSourceUrl ? { hoursSourceUrl } : {}),
      ...(note ? { note } : {}), lastReviewed: reviewedAt.slice(0, 10), reviewAfterDays: 180 as const,
    };
    const updated: ApprovedContactRecord = {
      ...current, revision: current.revision + 1, contact,
      history: [{
        reviewedAt, reviewer, reason, sourceVerified: true, purposeVerified: true,
        before: current.contact, after: contact,
      }, ...current.history],
    };
    await client.query(`INSERT INTO approved_contacts (namespace, contact_id, data) VALUES ($1,$2,$3)
      ON CONFLICT (namespace, contact_id) DO UPDATE SET data = EXCLUDED.data`, [namespace, input.contactId, JSON.stringify(updated)]);
    // A baseline confirmation opened before the correction must be reviewed again.
    if (source.rows[0]) {
      await client.query("UPDATE contact_source_reviews SET data = $3 WHERE namespace = $1 AND source_url = $2",
        [namespace, input.reviewedSourceUrl, JSON.stringify({ ...source.rows[0].data, revision: sourceRevision + 1 })]);
    }
    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}