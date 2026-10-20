import type { Agency } from "./agency-data";

export const SERVICE_AGENCIES = {
  garbage_recycling: "sj-environmental-services",
  private_property_conditions: "sj-code-enforcement",
  property_tax: "scc-tax-collections",
  county_benefits: "scc-social-services",
  unemployment: "ca-edd",
  driver_license: "ca-dmv",
  vehicle_registration: "ca-dmv",
  public_street: "sj-transportation",
  unknown: null,
} as const;
export const SERVICE_ACTIONS = ["renew", "replace", "report_problem", "dispute_bill", "check_status", "apply", "ask_information", "unknown"] as const;
export type ServiceRequestEvidence = {
  serviceFamily: keyof typeof SERVICE_AGENCIES;
  requestedAction: typeof SERVICE_ACTIONS[number];
  supportingText: string;
  uncertainty: "none" | "ambiguous" | "missing_context" | "outside_scope";
};
export const SERVICE_REQUEST_SCHEMA = {
  type: "array", items: {
    type: "object", additionalProperties: false,
    properties: {
      serviceFamily: { type: "string", enum: Object.keys(SERVICE_AGENCIES) },
      requestedAction: { type: "string", enum: SERVICE_ACTIONS },
      supportingText: { type: "string" },
      uncertainty: { type: "string", enum: ["none", "ambiguous", "missing_context", "outside_scope"] },
    }, required: ["serviceFamily", "requestedAction", "supportingText", "uncertainty"],
  },
};
const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").toLowerCase().trim();

export function validateServiceEvidence(value: unknown, original: string) {
  if (!Array.isArray(value)) return { requests: [] as ServiceRequestEvidence[], invalid: true };
  const requests: ServiceRequestEvidence[] = [];
  let invalid = value.length > 8;
  for (const item of value.slice(0, 8)) {
    if (!item || typeof item !== "object" || !Object.hasOwn(SERVICE_AGENCIES, item.serviceFamily) ||
      !SERVICE_ACTIONS.includes(item.requestedAction) ||
      !["none", "ambiguous", "missing_context", "outside_scope"].includes(item.uncertainty) ||
      typeof item.supportingText !== "string" || normalize(item.supportingText).length < 2 ||
      !original.includes(item.supportingText)) {
      invalid = true;
      continue;
    }
    requests.push({ serviceFamily: item.serviceFamily, requestedAction: item.requestedAction,
      supportingText: item.supportingText.slice(0, 2000), uncertainty: item.uncertainty });
  }
  // Keep resident issue order rather than sorting by model confidence.
  requests.sort((a, b) => normalize(original).indexOf(normalize(a.supportingText)) -
    normalize(original).indexOf(normalize(b.supportingText)));
  return { requests, invalid };
}

export function serviceRecommendations(requests: ServiceRequestEvidence[], agencies: readonly Agency[]) {
  const result: { a: Agency; score: number; request: ServiceRequestEvidence }[] = [];
  for (const request of requests) {
    const id = SERVICE_AGENCIES[request.serviceFamily];
    const a = agencies.find(agency => agency.id === id);
    if (a && !result.some(item => item.a.id === a.id)) result.push({ a, score: 1, request });
  }
  return result;
}

export function hasUnsupportedService(requests: ServiceRequestEvidence[]) {
  return requests.some(item => item.serviceFamily === "unknown" && item.uncertainty === "none");
}

export function serviceNextStep(agency: Agency, requests: ServiceRequestEvidence[], fallback: string) {
  const request = requests.find(item => SERVICE_AGENCIES[item.serviceFamily] === agency.id);
  if (request?.serviceFamily === "driver_license") {
    if (request.requestedAction === "renew") return "Use the DMV's driver license renewal service to check eligibility and follow the official renewal instructions.";
    if (request.requestedAction === "replace") return "Use the DMV's driver license replacement service and follow the official identity-verification steps.";
  }
  if (request?.serviceFamily === "garbage_recycling" && request.requestedAction === "dispute_bill") {
    return "Contact San José Environmental Services through its official website about your garbage or recycling bill; have the bill ready.";
  }
  return fallback;
}