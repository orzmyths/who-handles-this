import { Router, type IRouter } from "express";
import { desc, isNull } from "drizzle-orm";
import { db, routingHistory } from "@workspace/db";
import { agencyById } from "../lib/agency-data";
import { CorrectApprovedContactBody, CorrectApprovedContactResponse } from "@workspace/api-zod";
import { correctApprovedContact, ContactCorrectionError } from "../lib/approved-contact-store";
import { authenticatedUserId, requireStaff, requireResident } from "../lib/access-control";
import { checkContactSources, confirmContactSource, listContactSourceReviews } from "../lib/contact-source-store";
import {
  addStaffCase,
  getStaffCase,
  getLatestDemoReset,
  listStaffCases,
  resetDemoCases,
  saveStaffCase,
  StaffCaseConflictError,
  type Case,
} from "../lib/staff-case-store";

const now = () => new Date().toISOString();

const router: IRouter = Router();
// Reporting a wrong recommendation is a resident action, not a staff decision.
// It remains under its existing URL for client compatibility.
router.use("/staff", (req, res, next) => {
  if (req.method === "POST" && req.path === "/cases/report-wrong") {
    return requireResident(req, res, next);
  }
  return requireStaff(req, res, next);
});
router.get("/staff/legacy-reports", async (_req, res) => {
  res.json(await db.select().from(routingHistory)
    .where(isNull(routingHistory.ownerUserId))
    .orderBy(desc(routingHistory.createdAt), desc(routingHistory.id)));
});

router.post("/staff/contacts/correct", async (req, res): Promise<void> => {
  const parsed = CorrectApprovedContactBody.strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "All correction fields, both verification confirmations, and a review reason are required." }); return; }
  try { res.json(CorrectApprovedContactResponse.parse(await correctApprovedContact(parsed.data, authenticatedUserId(req)!))); }
  catch (error) {
    if (!(error instanceof ContactCorrectionError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
});

router.get("/staff/cases", async (req, res) => {
  res.json(await listStaffCases());
});

router.get("/staff/contact-sources", async (req, res) => {
  res.json(await listContactSourceReviews());
});

router.post("/staff/contact-sources/check", async (req, res) => {
  res.json(await checkContactSources());
});

router.post("/staff/contact-sources/confirm", async (req, res) => {
  const { sourceUrl, revision, reason } = req.body ?? {};
  if (!(await listContactSourceReviews()).some(item => item.sourceUrl === sourceUrl) || !Number.isInteger(revision) || revision < 0 ||
    typeof reason !== "string" || !reason.trim() || reason.length > 2000) {
    res.status(400).json({ error: "Approved source, revision and review note are required." });
    return;
  }
  const result = await confirmContactSource(sourceUrl, revision, reason.trim(), authenticatedUserId(req)!);
  if (!result) { res.status(409).json({ error: "Source changed or is inaccessible. Reload and review again." }); return; }
  res.json(result);
});

router.post("/staff/cases/reset", async (req, res) => {
  const result = await resetDemoCases(authenticatedUserId(req)!);
  res.json(result);
});

router.get("/staff/cases/reset", async (req, res) => {
  res.json(await getLatestDemoReset());
});

router.get("/staff/cases/:caseId", async (req, res) => {
  const caseData = await getStaffCase(req.params.caseId);
  if (!caseData) {
    res.status(404).json({ error: "Case not found." });
    return;
  }
  res.json(caseData);
});

router.post("/staff/cases/:caseId/actions", async (req, res) => {
  const caseData = await getStaffCase(req.params.caseId);
  const body = req.body ?? {};
  if (!caseData) {
    res.status(404).json({ error: "Case not found." });
    return;
  }
  if (
    !["approve", "edit_agency", "reject", "request_more_information", "suppress_unsafe"].includes(body.action) ||
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    !Number.isInteger(body.revision) ||
    body.revision < 0
  ) {
    res.status(400).json({ error: "Action, reason, and case revision are required." });
    return;
  }
  if (body.action === "edit_agency" && (typeof body.agencyId !== "string" || !agencyById(body.agencyId))) {
    res.status(400).json({ error: "Agency must be approved." });
    return;
  }

  const before = caseData.status;
  if (body.action === "approve" && !caseData.aiSuggestedAgencyId) {
    if (caseData.possibleAgencyIds.length !== 1) {
      res.status(400).json({error:"Select one curated agency before approving this case."});return;
    }
    caseData.aiSuggestedAgencyId = caseData.possibleAgencyIds[0];
  }
  if (body.action === "edit_agency") {
    caseData.aiSuggestedAgencyId = body.agencyId;
    caseData.possibleAgencyIds = [body.agencyId];
  }
  caseData.status =
    body.action === "approve"
      ? "approved"
      : body.action === "reject"
        ? "rejected"
        : body.action === "request_more_information"
          ? "awaiting_information"
          : body.action === "suppress_unsafe"
            ? "suppressed"
            : "edited";
  caseData.residentOutcomePreview = body.action === "approve"
    ? "A demo reviewer approved the recommended office. This is a simulated decision, not an official City determination."
    : body.action === "edit_agency"
      ? "A demo reviewer changed the proposed office. Approval is still required before this becomes the reviewed recommendation."
      : body.action === "request_more_information"
        ? "A demo reviewer needs more information. Read the reason below; you can submit a clarified report from the home page. No real staff are monitoring this prototype."
        : body.action === "suppress_unsafe"
          ? "This simulated review suppressed an unsafe recommendation. No official action or submission has occurred."
          : "A demo reviewer rejected the proposed routing. No official action or submission has occurred.";
  caseData.auditHistory.push({
    timestamp: now(),
    action: body.action,
    beforeStatus: before,
    afterStatus: caseData.status,
    reviewer: authenticatedUserId(req)!,
    reason: body.reason.trim(),
  });
  try {
    res.json(await saveStaffCase(caseData, body.revision));
  } catch (error) {
    if (!(error instanceof StaffCaseConflictError)) throw error;
    res.status(409).json({
      error: error.message,
      case: await getStaffCase(req.params.caseId),
    });
  }
});

router.post("/staff/cases/report-wrong", async (req, res) => {
  const body = req.body ?? {};
  if (typeof body.description !== "string" || !body.description.trim() || !agencyById(body.agencyId)) {
    res.status(400).json({ error: "Description and approved agencyId are required." });
    return;
  }
  const createdAt = now();
  const caseData: Case = {
    ownerUserId: authenticatedUserId(req)!,
    status: "needs_review",
    sourceFreshnessWarning: false,
    extractedFacts: [],
    missingInformation: [],
    aiSuggestedAgencyId: body.agencyId,
    officialEvidence: [agencyById(body.agencyId)!.officialUrl],
    validationConflicts: [],
    riskFlags: [],
    clarificationHistory: [],
    id: `reported-${Date.now()}`,
    revision: 0,
    submittedAt: createdAt,
    reviewReason: "resident-reported-wrong",
    possibleAgencyIds: [body.agencyId],
    residentDescription: body.description,
    residentOutcomePreview: "Your report was received for staff review.",
    auditHistory: [
      {
        timestamp: createdAt,
        action: "report_wrong",
        beforeStatus: "new",
        afterStatus: "needs_review",
        reviewer: authenticatedUserId(req)!,
        reason: "Resident reported wrong agency",
      },
    ],
  };
  await addStaffCase(caseData);
  res.json({ accepted: true });
});

export default router;
