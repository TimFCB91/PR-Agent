import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { generatePitchEmail } from "@/lib/outreach/outreachManager";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";

export const pitchInputSchema = z.object({
  clientName: z.string(),
  topicTitle: z.string().nullish(),
  mediaAngle: z.string().nullish(),
  contactFirstName: z.string().nullish(),
  contactOutlet: z.string().nullish(),
});

export const pitchOutputSchema = z.object({
  subject: z.string(),
  pitchEmail: z.string(),
  reasoning: z.string(),
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
  }),
};

export function runPitchAgent(input: PitchAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
