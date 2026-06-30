import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import {
  runAgent,
  type AgentContext,
  type AgentDefinition,
} from "@/lib/ai/agents/runAgent";

const level = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const topicExtractInputSchema = z.object({
  clientName: z.string(),
  documentTitle: z.string(),
  documentText: z.string(),
});

export const topicExtractOutputSchema = z.object({
  topics: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      mediaAngle: z.string().optional(),
      targetMediaType: z.string().optional(),
      searchPotential: level.optional(),
      newsValue: level.optional(),
      priority: level.optional(),
    }),
  ),
});

export type TopicExtractInput = z.infer<typeof topicExtractInputSchema>;
export type TopicExtractOutput = z.infer<typeof topicExtractOutputSchema>;

/** Heuristic fallback: treat non-trivial lines/bullets as topic titles. */
function mockExtract(input: TopicExtractInput): TopicExtractOutput {
  const lines = input.documentText
    .split("\n")
    .map((l) => l.replace(/^[\s•\-*–·\d.)]+/, "").trim())
    .filter((l) => l.length >= 4 && l.length <= 200);
  const seen = new Set<string>();
  const topics = [];
  for (const l of lines) {
    const key = l.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ title: l.slice(0, 200) });
    if (topics.length >= 25) break;
  }
  return { topics };
}

const definition: AgentDefinition<TopicExtractInput, TopicExtractOutput> = {
  name: "topicExtractAgent",
  inputSchema: topicExtractInputSchema,
  outputSchema: topicExtractOutputSchema,
  maxTokens: 8000,
  buildMessages: (input) => PROMPTS.topicExtractAgent(input),
  mock: mockExtract,
};

export function runTopicExtractAgent(
  input: TopicExtractInput,
  ctx: AgentContext,
) {
  return runAgent(definition, input, ctx);
}
