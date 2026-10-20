import {
  AGENCIES,
  AGENCY_RECORD_COUNT,
  validateAgencyRecords,
  isStale,
} from "../../artifacts/api-server/src/lib/agency-data";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const verifyFailureCases = () => {
  const missingReviewDate = AGENCIES.map((agency, index) =>
    index === 0 ? { ...agency, lastReviewed: "" } : agency,
  );
  assert(
    validateAgencyRecords(missingReviewDate).some((issue) =>
      issue.includes("lastReviewed is missing"),
    ),
    "Validator did not reject a missing review date.",
  );

  const expiredReviewDate = AGENCIES.map((agency, index) =>
    index === 0 ? { ...agency, lastReviewed: "2020-01-01" } : agency,
  );
  assert(
    validateAgencyRecords(expiredReviewDate).some((issue) =>
      issue.includes("older than the allowed interval"),
    ),
    "Validator did not reject an expired review date.",
  );

  const pendingVerification = AGENCIES.map((agency, index) =>
    index === 0
      ? { ...agency, todoManuallyVerify: ["Verify the official source"] }
      : agency,
  );
  assert(
    validateAgencyRecords(pendingVerification).some((issue) =>
      issue.includes("manual-verification markers remain"),
    ),
    "Validator did not reject a pending manual-verification marker.",
  );
  const mutateContact = (patch: Partial<(typeof AGENCIES)[number]["contactOptions"][number]>) =>
    AGENCIES.map((agency, index) => index === 0 ? {
      ...agency,
      contactOptions: agency.contactOptions.map((contact, contactIndex) =>
        contactIndex === 0 ? { ...contact, ...patch } : contact),
    } : agency);
  assert(validateAgencyRecords(mutateContact({ lastReviewed: "2020-01-01" }))
    .some(issue => issue.includes("contact review")), "Expired contact evidence was accepted.");
  assert(isStale(mutateContact({ lastReviewed: "2020-01-01" })[0]),
    "Expired contact evidence did not block routing.");
  assert(validateAgencyRecords(mutateContact({ value: "555" }))
    .some(issue => issue.includes("phone must")), "Invalid phone number was accepted.");
  assert(validateAgencyRecords(mutateContact({ sourceUrl: "https://example.com/" }))
    .some(issue => issue.includes("contact source")), "Unofficial contact source was accepted.");
  assert(validateAgencyRecords(AGENCIES.map((agency, index) =>
    index === 0 ? { ...agency, contactOptions: [] } : agency))
    .some(issue => issue.includes("verified phone and online")), "Missing contacts were accepted.");
};

const checkOfficialLink = async (url: string) => {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(5_000),
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Who-Handles-This-agency-preflight/1.0",
    },
  });
  if (response.status === 405 || response.status === 501) {
    return fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5_000),
      headers: {
        "user-agent": "Who-Handles-This-agency-preflight/1.0",
      },
    });
  }
  return response;
};

const run = async () => {
  verifyFailureCases();
  const { getApprovedAgencies } = await import("../../artifacts/api-server/src/lib/approved-contact-store");
  const agencies = await getApprovedAgencies();
  const issues = validateAgencyRecords(agencies);
  assert(
    AGENCIES.length === AGENCY_RECORD_COUNT && issues.length === 0,
    issues.join("\n") || "Agency record count is invalid.",
  );

  const skipLinks = process.argv.includes("--skip-links");
  if (!skipLinks) {
    // Persist review signals for staff before reachability failures can abort preflight.
    const { checkContactSources } = await import("../../artifacts/api-server/src/lib/contact-source-store");
    const reviews = await checkContactSources();
    for (const review of reviews) {
      if (review.status !== "current" || review.accessStatus !== "ok") {
        console.warn(`CONTACT REVIEW ${review.status} (${review.accessStatus}): ${review.sourceUrl} — ${review.detail}`);
      }
    }
    assert(!reviews.some(review => review.status === "changed"),
      "Official contact instructions changed. Review the saved comparisons in the staff contact-source queue; approved contact details were not modified.");
    const checked = new Set<string>();
    for (const agency of agencies) {
      const urls = [agency.officialUrl, ...agency.contactOptions.flatMap(contact => [
        contact.sourceUrl, ...(contact.kind === "online" ? [contact.value] : []),
        ...(contact.hoursSourceUrl ? [contact.hoursSourceUrl] : []),
      ])];
      for (const url of urls) {
        if (checked.has(url)) continue;
        checked.add(url);
        let response: Response;
        try {
          response = await checkOfficialLink(url);
        } catch (error) {
          throw new Error(
            `${agency.id}: official link ${url} could not be reached (${error instanceof Error ? error.message : String(error)}).`,
          );
        }
        const accessRestricted = response.status === 401 || response.status === 403;
        assert(
          response.ok || accessRestricted,
          `${agency.id}: official link ${url} returned HTTP ${response.status}.`,
        );
        if (accessRestricted) {
          console.warn(
            `WARN ${agency.id}: official link responded but restricted automated access with HTTP ${response.status}.`,
          );
        }
      }
    }
  }

  console.log(
    `Agency preflight passed: ${AGENCIES.length}/${AGENCY_RECORD_COUNT} records${skipLinks ? " (official link checks skipped)" : " and official links reachable"}.`,
  );
};

run().catch((error: unknown) => {
  console.error(`Agency preflight failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}).finally(async () => {
  const { pool } = await import("../../lib/db/src/index");
  await pool.end();
});