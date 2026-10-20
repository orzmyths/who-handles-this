import type { Agency } from "./agency-data";
import { communicationFor } from "./department-communication";

// Preserve the saved decision, but display current approved contact evidence.
// Reading history does not rewrite the original stored routing/audit output.
export function currentRoutingEvidence(savedOutput: unknown, agencies: readonly Agency[], description: string) {
  const output = structuredClone(savedOutput) as any;
  const refresh = (recommendation: any) => {
    if (!recommendation?.selected) return;
    const current = agencies.find(a => a.id === recommendation.selected.id);
    if (current) {
      recommendation.selected = current;
      recommendation.communication = communicationFor(current, description) ?? null;
    }
  };
  refresh(output);
  for (const recommendation of output.additionalRecommendations ?? []) refresh(recommendation);
  return output;
}