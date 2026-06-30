import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";
import {
  knowledgeChunkInput,
  sourceReferenceOutput,
  referencesFromChunks,
  missingInfoFor,
} from "@/lib/ai/agents/knowledgeContext";

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
      // Media intelligence — historical performance per contact.
      replyRate: z.number(),
      acceptanceRate: z.number(),
      publicationRate: z.number(),
      preferredAngles: z.array(z.string()),
      avoidedTopics: z.array(z.string()),
      lastSuccessfulTopic: z.string().nullish(),
    }),
  ),
  sources: z.array(knowledgeChunkInput),
});

export const mediaMatchOutputSchema = z.object({
  matches: z.array(
    z.object({
      mediaContactId: z.string(),
      matchScore: z.number(), // 0-100 (fit)
      historicalSuccessScore: z.number().optional(), // 0-100 (track record)
      reason: z.string(),
      suggestedAngle: z.string(),
    }),
  ),
  sourceReferences: z.array(sourceReferenceOutput),
  missingInfo: z.array(z.string()),
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
      .map((c) => {
        const fit = score(input.topic.title, c.beat, c.outlet);
        // Historical track record (acceptance + publication weighted, reply minor).
        const historical = Math.round(
          0.5 * c.acceptanceRate + 0.3 * c.publicationRate + 0.2 * c.replyRate,
        );
        const avoids = c.avoidedTopics.some(
          (t) => t.toLowerCase() === input.topic.title.toLowerCase(),
        );
        // Blend fit + history; penalise topics the contact tends to decline.
        const matchScore = Math.max(
          0,
          Math.round(0.5 * fit + 0.5 * historical - (avoids ? 30 : 0)),
        );
        const reasons: string[] = [];
        if (c.beat) reasons.push(`Ressort „${c.beat}" passt`);
        if (c.acceptanceRate > 0) reasons.push(`Zusagequote ${c.acceptanceRate}%`);
        if (c.lastSuccessfulTopic) reasons.push(`zuletzt erfolgreich: „${c.lastSuccessfulTopic}"`);
        if (avoids) reasons.push("Achtung: ähnliche Themen wurden abgelehnt");
        return {
          mediaContactId: c.id,
          matchScore,
          historicalSuccessScore: historical,
          reason: reasons.length ? reasons.join("; ") + "." : "Allgemeiner Kontakt.",
          suggestedAngle:
            c.preferredAngles[0] ??
            input.topic.mediaAngle ??
            `Thema „${input.topic.title}" anbieten.`,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore),
    sourceReferences: referencesFromChunks(input.sources),
    missingInfo: missingInfoFor(input.sources, input.topic.title),
  }),
};

export function runMediaMatchingAgent(input: MediaMatchInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
