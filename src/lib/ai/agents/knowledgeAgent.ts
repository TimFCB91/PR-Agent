import { z } from "zod";

import type { KnowledgeCategory } from "@prisma/client";

import { PROMPTS } from "@/lib/ai/prompts";
import {
  runAgent,
  type AgentContext,
  type AgentDefinition,
} from "@/lib/ai/agents/runAgent";
import { buildKnowledge } from "@/lib/ai/knowledge/knowledgeBuilder";

const CATEGORIES: KnowledgeCategory[] = [
  "POSITIONING",
  "EXPERTISE",
  "TARGET_GROUP",
  "PROOF_POINT",
  "QUOTE",
  "REFERENCE",
  "TOPIC_FIELD",
  "MEDIA_ANGLE",
  "NO_GO",
  "RISK",
  "FAQ",
  "COMPETITOR",
  "OTHER",
];

export const knowledgeInputSchema = z.object({
  clientName: z.string(),
  notes: z.string().nullish(),
  documents: z.array(
    z.object({
      ref: z.string(), // stable reference (d0, d1, …) → mapped back to a real id
      title: z.string(),
      text: z.string(),
    }),
  ),
});

export const knowledgeOutputSchema = z.object({
  knowledge: z.array(
    z.object({
      // Tolerate unknown/lowercase categories from the model; normalise later.
      category: z.string(),
      title: z.string().min(1),
      content: z.string().optional(),
      confidence: z.number().min(0).max(100).optional(),
      sources: z.array(z.string()).optional(),
    }),
  ),
  mediaAreas: z.array(z.string()).optional(),
});

export type KnowledgeAgentInput = z.infer<typeof knowledgeInputSchema>;
export type KnowledgeAgentOutput = z.infer<typeof knowledgeOutputSchema>;

/** Map a model-provided category string onto the KnowledgeCategory enum. */
export function normaliseCategory(raw: string): KnowledgeCategory {
  const up = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (CATEGORIES as string[]).includes(up)
    ? (up as KnowledgeCategory)
    : "OTHER";
}

const definition: AgentDefinition<KnowledgeAgentInput, KnowledgeAgentOutput> = {
  name: "knowledgeAgent",
  inputSchema: knowledgeInputSchema,
  outputSchema: knowledgeOutputSchema,
  buildMessages: (input) => PROMPTS.knowledgeAgent(input),
  // Deterministic fallback (only used when real AI is unavailable): reuse the
  // keyword-based builder so the workflow still degrades gracefully.
  mock: (input) => {
    const built = buildKnowledge(
      input.documents.map((d) => ({
        id: d.ref,
        title: d.title,
        rawText: d.text,
        sourceType: "DOCUMENT",
      })),
    );
    return {
      knowledge: built.knowledge.map((k) => ({
        category: k.category as string,
        title: k.title,
        content: k.content,
        confidence: k.confidence,
        sources: k.sourceIds,
      })),
      mediaAreas: [],
    };
  },
};

export function runKnowledgeAgent(
  input: KnowledgeAgentInput,
  ctx: AgentContext,
) {
  return runAgent(definition, input, ctx);
}
