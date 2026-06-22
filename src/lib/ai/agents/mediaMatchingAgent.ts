import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";

export const mediaMatchInputSchema = z.object({
  topic: z.object({
    title: z.string(),
    targetMediaType: z.string().nullish(),
    mediaAngle: z.string().nullish(),
  }),
  clientProfile: z.string().nullish(),
  mediaContacts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      outlet: z.string().nullish(),
      beat: z.string().nullish(),
    }),
  ),
});

export const mediaMatchOutputSchema = z.object({
  matches: z.array(
    z.object({
      mediaContactId: z.string(),
      matchScore: z.number(), // 0-100
      reason: z.string(),
      suggestedAngle: z.string(),
    }),
  ),
});

export type MediaMatchInput = z.infer<typeof mediaMatchInputSchema>;
export type MediaMatchOutput = z.infer<typeof mediaMatchOutputSchema>;

// Mock scoring: keyword overlap between the topic and a contact's beat/outlet.
function score(topic: string, beat?: string | null, outlet?: string | null): number {
  const words = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const haystack = `${beat ?? ""} ${outlet ?? ""}`.toLowerCase();
  const hits = words.filter((w) => haystack.includes(w)).length;
  return Math.min(100, 40 + hits * 20 + (beat ? 15 : 0));
}

const definition: AgentDefinition<MediaMatchInput, MediaMatchOutput> = {
  name: "mediaMatchingAgent",
  inputSchema: mediaMatchInputSchema,
  outputSchema: mediaMatchOutputSchema,
  buildMessages: (input) => PROMPTS.mediaMatchingAgent(input),
  mock: (input) => ({
    matches: input.mediaContacts
      .map((c) => ({
        mediaContactId: c.id,
        matchScore: score(input.topic.title, c.beat, c.outlet),
        reason: c.beat
          ? `Ressort „${c.beat}" passt zum Thema.`
          : "Allgemeiner Kontakt ohne spezifisches Ressort.",
        suggestedAngle:
          input.topic.mediaAngle ?? `Thema „${input.topic.title}" anbieten.`,
      }))
      .sort((a, b) => b.matchScore - a.matchScore),
  }),
};

export function runMediaMatchingAgent(input: MediaMatchInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
