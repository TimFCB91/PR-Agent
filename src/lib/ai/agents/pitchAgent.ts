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
});

export const pitchOutputSchema = z.object({
  subject: z.string(),
  pitchEmail: z.string(),
  reasoning: z.string(),
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
  mock: (input) => ({
    subject: input.topicTitle
      ? `Themenvorschlag: ${input.topicTitle}`
      : `Themenvorschlag von ${input.clientName}`,
    pitchEmail: generatePitchEmail({
      clientName: input.clientName,
      topicTitle: input.topicTitle,
      mediaAngle: input.mediaAngle,
      contactFirstName: input.contactFirstName,
      contactOutlet: input.contactOutlet,
    }),
    reasoning: "Mock-Pitch auf Basis von Thema und Medienkontakt.",
    sourceReferences: referencesFromChunks(input.sources),
    missingInfo: missingInfoFor(input.sources, input.topicTitle ?? input.clientName),
  }),
};

export function runPitchAgent(input: PitchAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
