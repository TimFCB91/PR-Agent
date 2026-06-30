import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";
import {
  knowledgeChunkInput,
  sourceReferenceOutput,
  referencesFromChunks,
  missingInfoFor,
} from "@/lib/ai/agents/knowledgeContext";
import { topicSimilarity } from "@/lib/media/mediaPerformanceCalculator";

const level = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const topicInputSchema = z.object({
  clientName: z.string(),
  knowledge: z.array(
    z.object({
      category: z.string(),
      title: z.string(),
      content: z.string().nullish(),
    }),
  ),
  // Retrieved knowledge chunks (mandatory pre-step).
  sources: z.array(knowledgeChunkInput),
  // Media-intelligence: topics that historically succeeded / failed.
  history: z.object({
    successes: z.array(z.string()),
    failures: z.array(z.string()),
  }),
});

export const topicOutputSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      relevance: level,
      targetMediaType: z.string(),
      mediaAngle: z.string(),
      searchPotential: level,
      priority: level,
      historicalNote: z.string().optional(),
    }),
  ),
  sourceReferences: z.array(sourceReferenceOutput),
  missingInfo: z.array(z.string()),
});

export type TopicAgentInput = z.infer<typeof topicInputSchema>;
export type TopicAgentOutput = z.infer<typeof topicOutputSchema>;

const HIGH_VALUE = ["TOPIC_FIELD", "PROOF_POINT", "MEDIA_ANGLE"];
const ANGLE: Record<string, string> = {
  EXPERTISE: "Experten-Beitrag",
  POSITIONING: "Unternehmensprofil",
  PROOF_POINT: "Zahlen-Story",
  TOPIC_FIELD: "Trend-Story",
  TARGET_GROUP: "Service-Artikel",
  MEDIA_ANGLE: "Direkter Pitch",
};

const definition: AgentDefinition<TopicAgentInput, TopicAgentOutput> = {
  name: "topicAgent",
  inputSchema: topicInputSchema,
  outputSchema: topicOutputSchema,
  maxTokens: 8000,
  buildMessages: (input) => PROMPTS.topicAgent(input),
  mock: (input) => ({
    topics: input.knowledge
      .filter((k) => !["NO_GO", "RISK", "MISSING_INFO"].includes(k.category))
      .map((k) => {
        const high = HIGH_VALUE.includes(k.category);
        const title = `Themenidee: ${k.title}`;
        // Historical adjustment: boost when similar topics succeeded, warn when
        // they often failed.
        const succeeded = input.history.successes.some(
          (s) => topicSimilarity(title, s) >= 0.34,
        );
        const failed = input.history.failures.some(
          (f) => topicSimilarity(title, f) >= 0.34,
        );
        let priority: "LOW" | "MEDIUM" | "HIGH" = high ? "HIGH" : "LOW";
        let historicalNote = "";
        if (succeeded) {
          priority = "HIGH";
          historicalNote = "Ähnliche Themen waren in der Vergangenheit erfolgreich.";
        } else if (failed) {
          historicalNote = "Warnung: Ähnliche Themen wurden häufig abgelehnt.";
        }
        return {
          title,
          description: k.content ? String(k.content).slice(0, 300) : undefined,
          relevance: (high ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
          targetMediaType: high ? "Online-Leitmedien" : "Fachpresse",
          mediaAngle: ANGLE[k.category] ?? "Allgemeiner Pitch",
          searchPotential: (high ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
          priority,
          historicalNote,
        };
      }),
    sourceReferences: referencesFromChunks(input.sources),
    missingInfo: missingInfoFor(input.sources, input.clientName),
  }),
};

export function runTopicAgent(input: TopicAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
