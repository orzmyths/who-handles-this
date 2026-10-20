import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { AGENCIES, isStale } from "../artifacts/api-server/src/lib/agency-data";
import { CorrectApprovedContactBody } from "../lib/api-zod/src/generated/api";
import { currentRoutingEvidence } from "../artifacts/api-server/src/lib/current-routing-evidence";

test("verified manual corrections persist, reject conflicts and unsafe evidence, and refresh resident history", async () => {
  process.env.STAFF_CASES_NAMESPACE = `contact-correction-test-${randomUUID()}`;
  const originalStore = await import("../artifacts/api-server/src/lib/approved-contact-store");
  const store = { ...originalStore, correctApprovedContact: (input: Parameters<typeof originalStore.correctApprovedContact>[0]) => originalStore.correctApprovedContact(input, "user_testReviewer") };
  const originalSources = await import("../artifacts/api-server/src/lib/contact-source-store");
  const sources = { ...originalSources, confirmContactSource: (url: string, revision: number, reason: string) => originalSources.confirmContactSource(url, revision, reason, "user_testReviewer") };
  const { pool } = await import("../lib/db/src/index");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(`<main><h1>Official instructions</h1><p>Contact purposes and published hours must be personally checked. A scraped replacement number 408-555-9999 is not an approved correction.</p></main>`, { headers: { "content-type": "text/html" } });
  const original = JSON.stringify(AGENCIES);
  try {
    const records = await store.listApprovedContacts();
    const current = records[0];
    const reviews = await sources.checkContactSources();
    const review = reviews.find(r => r.sourceUrl === current.contact.sourceUrl)!;
    const input = {
      contactId: current.contactId, revision: 0, reviewedSourceUrl: review.sourceUrl, sourceRevision: review.revision,
      label: current.contact.label, value: "+14085353501", sourceUrl: current.contact.sourceUrl,
      hours: "Monday–Friday, 9 a.m.–4 p.m.", hoursSourceUrl: current.contact.hoursSourceUrl ?? "",
      note: "Manually verified service questions only", reason: "Personally checked the published number, purpose and separate hours page",
      sourceVerified: true as const, purposeVerified: true as const,
    };
    assert.equal(CorrectApprovedContactBody.strict().safeParse({ ...input, purposeVerified: false }).success, false);
    assert.equal(CorrectApprovedContactBody.strict().safeParse({ ...input, lastReviewed: "2099-01-01" }).success, false);
    assert.equal(CorrectApprovedContactBody.strict().safeParse({ ...input, revision: -1 }).success, false);
    for (const invalid of [
      { sourceUrl: "https://www.sanjoseca.gov.evil.example/page" },
      { sourceUrl: "https://user:password@www.sanjoseca.gov/page" },
      { sourceUrl: "http://www.sanjoseca.gov/page" },
      { sourceUrl: "https://edd.ca.gov/en/contact" },
      { hoursSourceUrl: "https://evil.example/hours" },
      { value: "408-555-9999" }, { label: " " }, { reason: " " },
      { sourceVerified: false }, { purposeVerified: false },
    ]) {
      await assert.rejects(store.correctApprovedContact({ ...input, ...invalid } as any), (error: any) => error.status === 400);
    }
    await assert.rejects(store.correctApprovedContact({ ...input, sourceRevision: 0 }), (error: any) => error.status === 409);
    await assert.rejects(store.correctApprovedContact({ ...input, contactId: "unknown" }), (error: any) => error.status === 404);
    const updated = await store.correctApprovedContact(input);
    assert.equal(updated.revision, 1);
    assert.equal(updated.contact.value, input.value);
    assert.equal(updated.contact.lastReviewed, new Date().toISOString().slice(0, 10));
    assert.equal(updated.contact.reviewAfterDays, 180);
    assert.deepEqual(updated.history[0].before, current.contact);
    assert.deepEqual(updated.history[0].after, updated.contact);
    assert.equal(updated.history[0].reason, input.reason);
    assert.equal(updated.history[0].reviewer, "user_testReviewer");
    assert.equal((await store.listApprovedContacts())[0].contact.value, input.value);
    await assert.rejects(store.correctApprovedContact(input), (error: any) => error.status === 409);
    assert.equal(await sources.confirmContactSource(review.sourceUrl, review.revision, "Obsolete baseline review"), null);
    let nextReview = (await sources.listContactSourceReviews()).find(r => r.sourceUrl === review.sourceUrl)!;
    assert.equal(nextReview.status, "baseline_needed");
    assert.equal(nextReview.approvedContacts[0].contact.value, input.value);
    assert.equal(nextReview.approvedContacts[0].history.length, 1);

    // A blocked automated check does not prevent an attested manual browser correction.
    globalThis.fetch = async () => new Response("Blocked", { status: 403 });
    await sources.checkContactSources();
    nextReview = (await sources.listContactSourceReviews()).find(r => r.sourceUrl === review.sourceUrl)!;
    const cleared = await store.correctApprovedContact({
      ...input, revision: 1, sourceRevision: nextReview.revision, hours: "", hoursSourceUrl: "", note: "",
      sourceUrl: "https://www.sanjoseca.gov/manual-new-contact-source",
    });
    assert.equal(cleared.contact.hours, undefined);
    assert.equal(cleared.contact.note, undefined);
    assert.equal(cleared.history.length, 2);
    assert.ok((await sources.listContactSourceReviews()).some(r => r.sourceUrl === cleared.contact.sourceUrl && r.approvedContacts[0].contactId === current.contactId));
    const agencies = await store.getApprovedAgencies();
    assert.equal(agencies[0].lastReviewed, AGENCIES[0].lastReviewed);
    assert.deepEqual(agencies[0].contactOptions[0], cleared.contact);
    assert.deepEqual(agencies[0].contactOptions[1], AGENCIES[0].contactOptions[1]);
    const saved = { status: "routed", selected: AGENCIES[0], additionalRecommendations: [{ selected: AGENCIES[0] }] };
    const history = currentRoutingEvidence(saved, agencies, "garbage collection");
    assert.equal(history.selected.contactOptions[0].value, input.value);
    assert.equal(history.additionalRecommendations[0].selected.contactOptions[0].lastReviewed, cleared.contact.lastReviewed);
    assert.equal(saved.selected.contactOptions[0].value, current.contact.value);
    assert.equal(isStale(history.selected, Date.parse(cleared.contact.lastReviewed) + 181 * 86400000), true);
    assert.equal(JSON.stringify(AGENCIES), original);
  } finally {
    globalThis.fetch = originalFetch;
    await pool.query("DELETE FROM approved_contacts WHERE namespace = $1", [process.env.STAFF_CASES_NAMESPACE]);
    await pool.query("DELETE FROM contact_source_reviews WHERE namespace = $1", [process.env.STAFF_CASES_NAMESPACE]);
    await pool.end();
  }
});