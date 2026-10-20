import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  normalizeContactPage, observeResponse,
} from "../artifacts/api-server/src/lib/contact-source-content";
import { AGENCIES } from "../artifacts/api-server/src/lib/agency-data";
import { contactIsStale } from "../artifacts/api-server/src/lib/agency-contacts";

const page = (phone = "408-535-3500", purpose = "Residential service questions", hours = "Monday–Friday, 8 a.m.–5 p.m.") =>
  `<html><main><h1>Official contact instructions</h1><p>${purpose}</p><p>Call ${phone}.</p><p>Published service hours: ${hours}.</p><a href="https://www.sanjoseca.gov/311">Request assistance online</a></main></html>`;
const checkedAt = "2026-10-05T10:00:00.000Z";

test("page comparison catches phone, purpose, hours and link changes without inferring contacts", () => {
  const baseline = observeResponse(200, page(), checkedAt);
  assert.equal(baseline.status, "ok");
  for (const changed of [
    page("408-535-9999"), page(undefined, "Appointments only"),
    page(undefined, undefined, "Tuesday only, 9 a.m.–noon"),
    page().replace("/311", "/new-service"),
  ]) {
    assert.notEqual(observeResponse(200, changed, checkedAt).hash, baseline.hash);
  }
  assert.equal(normalizeContactPage(`<nav>Updated news</nav><script>dynamic()</script>${page()}<footer>2027</footer>`),
    normalizeContactPage(page()));
  assert.equal(normalizeContactPage(page().replace("Official contact", "Official    contact")), normalizeContactPage(page()));
});

test("access restrictions and broken links have no change fingerprints", () => {
  for (const status of [401, 403]) {
    const result = observeResponse(status, page("408-535-9999"), checkedAt);
    assert.equal(result.status, "restricted");
    assert.equal(result.hash, null);
  }
  for (const status of [404, 500]) assert.equal(observeResponse(status, page(), checkedAt).status, "unavailable");
  assert.equal(observeResponse(200, `<main>Verify you are human ${"x".repeat(150)}</main>`, checkedAt).status, "restricted");
  assert.equal(observeResponse(200, page(), checkedAt, "application/pdf").status, "unavailable");
});

test("180-day evidence policy is unchanged", () => {
  const contact = AGENCIES[0].contactOptions[0];
  const reviewedAt = Date.parse(contact.lastReviewed);
  assert.equal(contactIsStale(contact, reviewedAt + 180 * 86400000), false);
  assert.equal(contactIsStale(contact, reviewedAt + 180 * 86400000 + 1), true);
});

test("persisted changes survive restricted checks; confirmations are revision-checked and never renew contacts", async () => {
  // Isolated rows only; no staff cases or real source reviews are changed.
  process.env.STAFF_CASES_NAMESPACE = `contact-review-test-${randomUUID()}`;
  const originalStore = await import("../artifacts/api-server/src/lib/contact-source-store");
  const store = { ...originalStore, confirmContactSource: (url: string, revision: number, reason: string) => originalStore.confirmContactSource(url, revision, reason, "user_testReviewer") };
  const { pool } = await import("../lib/db/src/index");
  const originalFetch = globalThis.fetch;
  const originalContacts = JSON.stringify(AGENCIES);
  let html = page();
  let status = 200;
  globalThis.fetch = async () => new Response(html, { status, headers: { "content-type": "text/html" } });
  try {
    let results = await store.checkContactSources();
    const url = results[0].sourceUrl;
    assert.equal(results[0].status, "baseline_needed");
    assert.equal(results[0].baselineText, null); // first fetch is not human verification
    const confirmed = await store.confirmContactSource(url, results[0].revision, "Verified purposes and hours match the approved records");
    assert.equal(confirmed?.status, "current");
    assert.equal(await store.confirmContactSource(url, results[0].revision, "Stale review"), null);
    html = page("408-535-9999", "Appointments only", "Tuesday only");
    results = await store.checkContactSources();
    assert.equal(results[0].status, "changed");
    const changedText = results[0].candidateText;
    status = 403;
    results = await store.checkContactSources();
    assert.equal(results[0].status, "changed");
    assert.equal(results[0].accessStatus, "restricted");
    assert.equal(results[0].candidateText, changedText);
    assert.equal(results[0].canConfirm, false);
    assert.equal(await store.confirmContactSource(url, results[0].revision, "Cannot confirm blocked page"), null);
    status = 404;
    results = await store.checkContactSources();
    assert.equal(results[0].status, "changed");
    assert.equal(results[0].accessStatus, "unavailable");
    status = 200;
    results = await store.checkContactSources();
    const updated = await store.confirmContactSource(url, results[0].revision, "Manual review after approved records corrected separately");
    assert.equal(updated?.history.length, 2);
    assert.equal((await store.listContactSourceReviews())[0].status, "current");
    assert.equal(JSON.stringify(AGENCIES), originalContacts);
  } finally {
    globalThis.fetch = originalFetch;
    await pool.query("DELETE FROM contact_source_reviews WHERE namespace = $1", [process.env.STAFF_CASES_NAMESPACE]);
    await pool.end();
  }
});