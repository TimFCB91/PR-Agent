import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { generatePitchEmail } from "@/lib/outreach/outreachManager";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";
import {
  knowledgeChunkInput,
  sourceReferenceOutput,
  referencesFromChunks,
  missingInfoFor,
} from "@/lib/ai/agents/knowledgeContext";

export const pitchInputSchema = z.object({
  clientName: z.string(),
  topicTitle: z.string().nullish(),
  mediaAngle: z.string().nullish(),
  contactFirstName: z.string().nullish(),
  contactOutlet: z.string().nullish(),
  sources: z.array(knowledgeChunkInput),
  // Media intelligence — what has worked with this contact.
  contactStats: z
    .object({
      acceptanceRate: z.number(),
      replyRate: z.number(),
      preferredAngles: z.array(z.string()),
      lastSuccessfulTopic: z.string().nullish(),
    })
    .nullish(),
});

export const pitchOutputSchema = z.object({
  subject: z.string(),
  pitchEmail: z.string(),
  reasoning: z.string(),
  recommendedAngle: z.string().optional(),
  successProbability: z.number().optional(), // 0-100
  sourceReferences: z.array(sourceReferenceOutput),
  missingInfo: z.array(z.string()),
});

export type PitchAgentInput = z.infer<typeof pitchInputSchema>;
export type PitchAgentOutput = z.infer<typeof pitchOutputSchema>;

const definition: AgentDefinition<PitchAgentInput, PitchAgentOutput> = {
  name: "pitchAgent",
  inputSchema: pitchInputSchema,
  outputSchema: pitchOutputSchema,
  buildMessages: (input) => PROMPTS.pitchAgent(input),
  mock: (input) => {
    // Recommend the contact's best-performing angle when known.
    const recommendedAngle =
      input.contactStats?.preferredAngles[0] ??
      input.mediaAngle ??
      "Redaktioneller Themenvorschlag";
    // Rough success probability from the contact's track record.
    const stats = input.contactStats;
    const successProbability = stats
      ? Math.min(95, Math.round(0.7 * stats.acceptanceRate + 0.3 * stats.replyRate))
      : 25;
    return {
      subject: input.topicTitle
        ? `Themenvorschlag: ${input.topicTitle}`
        : `Themenvorschlag von ${input.clientName}`,
      pitchEmail: generatePitchEmail({
        clientName: input.clientName,
        topicTitle: input.topicTitle,
        mediaAngle: recommendedAngle,
        contactFirstName: input.contactFirstName,
        contactOutlet: input.contactOutlet,
      }),
      reasoning: stats?.lastSuccessfulTopic
        ? `Kontakt war zuletzt bei „${stats.lastSuccessfulTopic}" erfolgreich.`
        : "Mock-Pitch auf Basis von Thema und Medienkontakt.",
      recommendedAngle,
      successProbability,
      sourceReferences: referencesFromChunks(input.sources),
      missingInfo: missingInfoFor(input.sources, input.topicTitle ?? input.clientName),
    };
  },
};

export function runPitchAgent(input: PitchAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
