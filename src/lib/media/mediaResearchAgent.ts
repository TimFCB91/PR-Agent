import {
  getMediaResearchProvider,
  type ResearchQuery,
  type ResearchCandidate,
} from "@/lib/media/mediaResearchProvider";
import { validateCandidates } from "@/lib/media/mediaResearchValidator";

// Orchestrates media research: builds the query, calls the provider and runs
// every candidate through the compliance validator. Results are SUGGESTIONS —
// they are never auto-imported; a user must approve each one.

export interface ResearchAgentResult {
  candidates: ResearchCandidate[];
  provider: string;
}

export async function runMediaResearchAgent(
  query: ResearchQuery,
): Promise<ResearchAgentResult> {
  const provider = getMediaResearchProvider();
  const raw = await provider.research(query);
  const candidates = validateCandidates(raw).map((v) => v.candidate);
  return { candidates, provider: provider.name };
}
