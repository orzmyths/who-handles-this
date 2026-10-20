import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, staffCaseResetLogs, staffCases, routingHistory } from "@workspace/db";
import { AGENCIES } from "./agency-data";

export type Audit = {
  timestamp: string;
  action: string;
  beforeStatus: string;
  afterStatus: string;
  reviewer: string;
  reason: string;
};

export type Case = {
  ownerUserId?: string;
  id: string;
  revision: number;
  submittedAt: string;
  reviewReason: string;
  status: string;
  possibleAgencyIds: string[];
  sourceFreshnessWarning: boolean;
  residentDescription: string;
  extractedFacts: string[];
  missingInformation: string[];
  aiSuggestedAgencyId: string | null;
  officialEvidence: string[];
  validationConflicts: string[];
  riskFlags: string[];
  clarificationHistory: string[];
  residentOutcomePreview: string;
  auditHistory: Audit[];
  routingHistoryId?: number;
};

const storeNamespace = process.env.STAFF_CASES_NAMESPACE ?? "default";
const now = () => new Date().toISOString();

const demoSeeds = [
  {
    description:
      "My garbage pickup was missed at my home in San José on Tuesday. The cart was at the curb before 6 a.m., but the truck never came.",
    facts: ["Missed residential garbage pickup", "Service address is in San José", "Cart was placed at the curb before collection time"],
    missing: ["Confirm the service address", "Confirm the collection date"],
    reason: "Confirm city service and collection details",
  },
  {
    description:
      "There is a vacant house next door in San José with overgrown weeds, broken windows, and trash in the yard. It is private property.",
    facts: ["Private-property condition reported", "Possible blight and unsafe housing conditions", "Location described as San José"],
    missing: ["Confirm the property address", "Confirm whether anyone is in immediate danger"],
    reason: "Private-property conditions need jurisdiction review",
  },
  {
    description:
      "I received a delinquent property-tax bill from Santa Clara County and need to understand the payment deadline.",
    facts: ["Delinquent property-tax notice", "Notice appears to be from Santa Clara County", "Resident asks about a deadline"],
    missing: ["Confirm the parcel or bill reference", "Confirm the deadline printed on the notice"],
    reason: "Source freshness warning requires staff confirmation",
    sourceFreshnessWarning: true,
  },
  {
    description:
      "My CalFresh benefits notice says I need to respond, but I am not sure which documents the county needs.",
    facts: ["CalFresh food-assistance notice", "Resident needs help understanding a response request", "Matter appears related to county benefits"],
    missing: ["Confirm the notice deadline", "Confirm which benefit program is named"],
    reason: "Benefits notice needs a careful handoff",
  },
  {
    description:
      "My California unemployment claim is still pending and I received a message asking me to check my account.",
    facts: ["California unemployment claim", "Claim status is pending", "Resident received an account message"],
    missing: ["Confirm the claim or notice date", "Confirm whether the message is from EDD"],
    reason: "State benefit claim needs staff review",
  },
  {
    description:
      "I lost my California driver's license and need to replace it. I am not asking about vehicle registration.",
    facts: ["Lost California driver license", "Resident needs a replacement", "Vehicle registration is not the issue"],
    missing: ["Confirm identity-verification needs", "Confirm whether the resident has access to their DMV account"],
    reason: "Resident reported the initial recommendation may be wrong",
  },
];

function createSeedCases(): Case[] {
  return demoSeeds.map((seed, index) => {
    const agency = AGENCIES[index];
    const createdAt = now();
    return {
      id: `demo-${index + 1}`,
      revision: 0,
      submittedAt: createdAt,
      reviewReason: seed.reason,
      status: "needs_review",
      possibleAgencyIds: index === 1 ? [AGENCIES[0].id, agency.id] : [agency.id],
      sourceFreshnessWarning: seed.sourceFreshnessWarning ?? false,
      residentDescription: seed.description,
      extractedFacts: seed.facts,
      missingInformation: seed.missing,
      aiSuggestedAgencyId: index === 3 ? null : agency.id,
      officialEvidence: [agency.officialUrl],
      validationConflicts:
        index === 1 ? ["Equal keyword support between Environmental Services and Code Enforcement"] : [],
      riskFlags: index === 4 ? ["Benefit claim details should be confirmed through the official EDD account"] : [],
      clarificationHistory:
        index === 1
          ? ["The resident first described a vacant property, then clarified that it is privately owned."]
          : index === 5
            ? ["The resident clarified that the lost license is the issue, not vehicle registration."]
            : [],
      residentOutcomePreview: "We are reviewing the right public office before giving you a next step.",
      auditHistory: [
        {
          timestamp: createdAt,
          action: "created",
          beforeStatus: "new",
          afterStatus: "needs_review",
          reviewer: "System (demo seed)",
          reason: "Seeded demo case",
        },
      ],
    };
  });
}

let cases: Case[] = [];
let initialization: Promise<void> | null = null;

function normalizeCase(data: Case, fallbackRevision = 0): Case {
  return {
    ...data,
    revision:
      Number.isInteger(data.revision) && data.revision >= 0
        ? data.revision
        : fallbackRevision,
  };
}
async function initialize(): Promise<void> {
  const rows = await db
    .select()
    .from(staffCases)
    .where(eq(staffCases.namespace, storeNamespace))
    .orderBy(asc(staffCases.id));

  if (rows.length > 0) {
    cases = rows.map((row) =>
      normalizeCase(row.data as Case, 0),
    );
    return;
  }

  cases = createSeedCases();
  await db.insert(staffCases).values(
    cases.map((caseData) => ({
      namespace: storeNamespace,
      id: caseData.id,
      data: caseData,
    })),
  );
}

async function ensureInitialized(): Promise<void> {
  initialization ??= initialize().catch((error) => {
    initialization = null;
    throw error;
  });
  await initialization;
}

export async function listStaffCases(): Promise<Case[]> {
  await ensureInitialized();
  return cases.map(cloneCase);
}

export async function getStaffCase(caseId: string): Promise<Case | undefined> {
  await ensureInitialized();
  const caseData = cases.find((candidate) => candidate.id === caseId);
  return caseData ? cloneCase(caseData) : undefined;
}

export class StaffCaseConflictError extends Error {
  constructor() {
    super("The case changed since it was loaded.");
    this.name = "StaffCaseConflictError";
  }
}
export async function saveStaffCase(
  caseData: Case,
  expectedRevision: number,
): Promise<Case> {
  await ensureInitialized();
  const nextCase = {
    ...caseData,
    revision: expectedRevision + 1,
  };
  const updated = await db
    .update(staffCases)
    .set({ data: nextCase, updatedAt: new Date() })
    .where(
      and(
        eq(staffCases.namespace, storeNamespace),
        eq(staffCases.id, caseData.id),
        sql`coalesce(${staffCases.data}->>'revision', '0') = ${String(expectedRevision)}`,
      ),
    )
    .returning({ id: staffCases.id });
  if (updated.length === 0) {
    throw new StaffCaseConflictError();
  }

  cases = cases.map((candidate) =>
    candidate.id === nextCase.id ? nextCase : candidate,
  );
  return cloneCase(nextCase);
}

export async function addStaffCase(caseData: Case): Promise<void> {
  await ensureInitialized();
  const newCase = normalizeCase(caseData);
  await db
    .insert(staffCases)
    .values({
      namespace: storeNamespace,
      id: newCase.id,
      data: newCase,
    });
  cases.push(newCase);
}

type ReviewCaseInput = {
  residentDescription: string;
  reviewReason: string;
  possibleAgencyIds: string[];
  extractedFacts: string[];
  missingInformation: string[];
  sourceFreshnessWarning: boolean;
  clarificationHistory: string[];
};
function buildReviewCase(input: ReviewCaseInput): Case {
  const createdAt = now();
  const possibleAgencyIds = [...new Set(input.possibleAgencyIds)]
    .filter((id) => AGENCIES.some((agency) => agency.id === id))
    .slice(0, 3);
  const caseData: Case = {
    id: `review-${randomUUID()}`,
    revision: 0,
    submittedAt: createdAt,
    reviewReason: input.reviewReason.slice(0, 500),
    status: "needs_review",
    possibleAgencyIds,
    sourceFreshnessWarning: input.sourceFreshnessWarning,
    residentDescription: input.residentDescription.slice(0, 2000),
    extractedFacts: input.extractedFacts.slice(0, 10).map((fact) => fact.slice(0, 500)),
    missingInformation: input.missingInformation
      .slice(0, 10)
      .map((item) => item.slice(0, 500)),
    aiSuggestedAgencyId: null,
    officialEvidence: possibleAgencyIds.flatMap((id) => {
      const agency = AGENCIES.find((candidate) => candidate.id === id);
      return agency ? [agency.officialUrl] : [];
    }),
    validationConflicts: [],
    riskFlags: [],
    clarificationHistory: input.clarificationHistory
      .slice(0, 2)
      .map((answer) => answer.slice(0, 500)),
    residentOutcomePreview:
      "This prototype only simulates staff review. No real staff are monitoring this report.",
    auditHistory: [
      {
        timestamp: createdAt,
        action: "created",
        beforeStatus: "new",
        afterStatus: "needs_review",
        reviewer: "System (automated routing)",
        reason: "Added to the simulated staff review queue",
      },
    ],
  };

  return caseData;
}

export async function addNeedsReviewCase(input: ReviewCaseInput): Promise<void> {
  await addStaffCase(buildReviewCase(input));
}

export async function saveLinkedReviewReport(input: ReviewCaseInput, residentInput: any, output: any, ownerUserId: string) {
  await ensureInitialized();
  const caseData = buildReviewCase(input);
  caseData.ownerUserId = ownerUserId;
  const linked = await db.transaction(async tx => {
    const [row] = await tx.insert(routingHistory).values({ ownerUserId, input: residentInput, output }).returning();
    caseData.routingHistoryId = row.id;
    const result = { ...output, historyId: row.id, reviewCaseId: caseData.id };
    await tx.update(routingHistory).set({ output: result }).where(eq(routingHistory.id, row.id));
    await tx.insert(staffCases).values({ namespace: storeNamespace, id: caseData.id, data: caseData });
    return result;
  });
  cases.push(caseData);
  return linked;
}

// History can be refreshed by another browser/session, so do not serve the
// process-local queue cache as the resident's source of decision freshness.
export async function linkedReviewCases(historyIds: number[]) {
  if (!historyIds.length) return [];
  const rows = await db.select().from(staffCases).where(and(
    eq(staffCases.namespace, storeNamespace),
    sql`(${staffCases.data}->>'routingHistoryId')::integer in (${sql.join(historyIds.map(id => sql`${id}`), sql`, `)})`,
  ));
  return rows.map(row => normalizeCase(row.data as Case)).filter(item => item.routingHistoryId);
}

export async function resetDemoCases(reviewer: string): Promise<{
  resetCaseCount: number;
  retainedReportCount: number;
  resetAt: string;
}> {
  await ensureInitialized();
  const seededCases = createSeedCases();
  const seededIds = seededCases.map((caseData) => caseData.id);
  const retainedReports = cases.filter(
    (caseData) => !seededIds.includes(caseData.id),
  );
  const resetAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .delete(staffCases)
      .where(
        and(
          eq(staffCases.namespace, storeNamespace),
          inArray(staffCases.id, seededIds),
        ),
      );
    await tx.insert(staffCases).values(
      seededCases.map((caseData) => ({
        namespace: storeNamespace,
        id: caseData.id,
        data: caseData,
      })),
    );
    await tx.insert(staffCaseResetLogs).values({
      namespace: storeNamespace,
      resetAt,
      resetCaseCount: seededCases.length,
      retainedReportCount: retainedReports.length,
      reviewer,
    });
  });

  cases = [...seededCases, ...retainedReports];
  return {
    resetCaseCount: seededCases.length,
    retainedReportCount: retainedReports.length,
    resetAt: resetAt.toISOString(),
  };
}

function cloneCase(caseData: Case): Case {
  return structuredClone(caseData);
}
export async function getLatestDemoReset(): Promise<{
  lastResetAt: string | null;
  recentResets: Array<{
    resetAt: string;
    resetCaseCount: number;
    retainedReportCount: number;
  }>;
}> {
  await ensureInitialized();
  const recentResets = await db
    .select({
      resetAt: staffCaseResetLogs.resetAt,
      resetCaseCount: staffCaseResetLogs.resetCaseCount,
      retainedReportCount: staffCaseResetLogs.retainedReportCount,
    })
    .from(staffCaseResetLogs)
    .where(eq(staffCaseResetLogs.namespace, storeNamespace))
    .orderBy(desc(staffCaseResetLogs.resetAt))
    .limit(5);
  return {
    lastResetAt: recentResets[0]?.resetAt.toISOString() ?? null,
    recentResets: recentResets.map((reset) => ({
      resetAt: reset.resetAt.toISOString(),
      resetCaseCount: reset.resetCaseCount,
      retainedReportCount: reset.retainedReportCount,
    })),
  };
}
