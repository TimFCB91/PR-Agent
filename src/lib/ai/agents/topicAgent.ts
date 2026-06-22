import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";

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
});

export const topicOutputSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string(),
      relevance: level,
      targetMediaType: z.string(),
      mediaAngle: z.string(),
      searchPotential: level,
      priority: level,
    }),
  ),
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
  buildMessages: (input) => PROMPTS.topicAgent(input),
  mock: (input) => ({
    topics: input.knowledge
      .filter((k) => !["NO_GO", "RISK", "MISSING_INFO"].includes(k.category))
      .map((k) => {
        const high = HIGH_VALUE.includes(k.category);
        return {
          title: `Themenidee: ${k.title}`,
          relevance: (high ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
          targetMediaType: high ? "Online-Leitmedien" : "Fachpresse",
          mediaAngle: ANGLE[k.category] ?? "Allgemeiner Pitch",
          searchPotential: (high ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
          priority: (high ? "HIGH" : "LOW") as "HIGH" | "LOW",
        };
      }),
  }),
};

export function runTopicAgent(input: TopicAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
