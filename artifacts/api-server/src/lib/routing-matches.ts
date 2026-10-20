import { AGENCIES, type Agency } from "./agency-data";

// Faithful translations may use British spelling or different possessives.
// Canonicalize the specific driving credential, never generic business,
// hunting or other licenses into a DMV match.
export const normalizeRoutingWording = (text: string) => text.toLowerCase()
  .replace(/\b(?:führerschein|fuehrerschein)\b/g, "driver license")
  .replace(
    /\b(?:driver(?:['’‘ʼ]s|s)?|driving)[\s-]+(?:licen[sc]es?|permit)\b/g,
    "driver license",
  );

export const matches = (text: string, agencies: readonly Agency[] = AGENCIES) => {
  const normalized = normalizeRoutingWording(text);
  return (
  agencies.map(a => ({
    a,
    score: [...new Set(a.keywords.map(normalizeRoutingWording))]
      .filter(keyword => normalized.includes(keyword)).length,
  })).filter(match => match.score > 0).sort((a, b) => b.score - a.score)
  );
};

export function matchRoutingEvidence(
  original: string, normalized: string, agencies: readonly Agency[] = AGENCIES,
) {
  const normalizedMatches = matches(normalized, agencies);
  return normalizedMatches.length
    ? { text: normalized, matches: normalizedMatches }
    : { text: original, matches: matches(original, agencies) };
}

// Only independent, unambiguous clauses support multiple recommendations.
// AI candidate IDs alone must not turn an ambiguous choice into confirmed routing.
export function separateIssueMatches(text: string, found: ReturnType<typeof matches>) {
  if (/\b(or|either|not sure|o)\b/i.test(text)) return [];
  const clauses = text.split(/\s+(?:and|but|also|plus|y|pero|además)\s+|[.;\n]+/i);
  const ordered: ReturnType<typeof matches> = [];
  for (const clause of clauses) {
    const clauseMatches = matches(clause, found.map(item => item.a));
    if (clauseMatches.length > 1) return [];
    const match = clauseMatches[0];
    if (match && !ordered.some(item => item.a.id === match.a.id)) ordered.push(match);
  }
  return ordered.length > 1 && found.every(item => ordered.some(other => other.a.id === item.a.id))
    ? ordered
    : [];
}

export function nextStepFor(agency: Agency, text: string): string {
  const normalized = normalizeRoutingWording(text);
  if (agency.id === "ca-dmv") {
    const licenseClauses = normalized.split(/[.;\n]+|\s+(?:and|but|also|plus)\s+/i)
      .filter(clause => /\blicense\b/.test(clause));
    if (licenseClauses.some(clause => /\b(lost|lose|stolen|missing|verloren|gestohlen)\b/.test(clause))) {
      return "Use the DMV's driver license replacement service and follow the official identity-verification steps.";
    }
    if (licenseClauses.some(clause => /\b(expired|expire|expires|expiring|renew|renewal|renewing|abgelaufen|erneuern)\b/.test(clause))) {
      return "Use the DMV's driver license renewal service to check eligibility and follow the official renewal instructions.";
    }
  }
  if (agency.id === "sj-environmental-services" && /\b(?:trash|garbage|recycling)\s+bill\b/i.test(text)) {
    return "Contact San José Environmental Services through its official website about your garbage or recycling bill; have the bill ready.";
  }
  return agency.safeNextStepTemplate;
}