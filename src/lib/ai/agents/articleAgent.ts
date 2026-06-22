import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { buildArticleDraft } from "@/lib/articles/articleBuilder";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";
import {
  knowledgeChunkInput,
  sourceReferenceOutput,
  referencesFromChunks,
  missingInfoFor,
} from "@/lib/ai/agents/knowledgeContext";

export const articleInputSchema = z.object({
  clientName: z.string(),
  briefingTitle: z.string().nullish(),
  angle: z.string().nullish(),
  keyMessages: z.string().nullish(),
  suggestedStructure: z.string().nullish(),
  targetMedium: z.string().nullish(),
  targetAudience: z.string().nullish(),
  rules: z
    .object({
      toneOfVoice: z.string().nullish(),
      preferredStructure: z.string().nullish(),
      minWords: z.number().nullish(),
      maxWords: z.number().nullish(),
      forbiddenPhrases: z.array(z.string()),
    })
    .nullish(),
  sources: z.array(knowledgeChunkInput),
});

export const articleOutputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  article: z.string(),
  metaDescription: z.string(),
  sourceReferences: z.array(sourceReferenceOutput),
  missingInfo: z.array(z.string()),
});

export type ArticleAgentInput = z.infer<typeof articleInputSchema>;
export type ArticleAgentOutput = z.infer<typeof articleOutputSchema>;

const definition: AgentDefinition<ArticleAgentInput, ArticleAgentOutput> = {
  name: "articleAgent",
  inputSchema: articleInputSchema,
  outputSchema: articleOutputSchema,
  buildMessages: (input) => PROMPTS.articleAgent(input),
  mock: (input) => {
    const a = buildArticleDraft(
      {
        clientName: input.clientName,
        briefingTitle: input.briefingTitle,
        angle: input.angle,
        keyMessages: input.keyMessages,
        suggestedStructure: input.suggestedStructure,
        targetMedium: input.targetMedium,
        targetAudience: input.targetAudience,
      },
      input.rules
        ? {
            toneOfVoice: input.rules.toneOfVoice,
            preferredStructure: input.rules.preferredStructure,
            minWords: input.rules.minWords,
            maxWords: input.rules.maxWords,
            forbiddenPhrases: input.rules.forbiddenPhrases,
          }
        : undefined,
    );
    return {
      title: a.title,
      subtitle: a.subtitle,
      article: a.articleText,
      metaDescription: a.metaDescription,
      sourceReferences: referencesFromChunks(input.sources),
      missingInfo: missingInfoFor(input.sources, input.briefingTitle ?? input.clientName),
    };
  },
};

export function runArticleAgent(input: ArticleAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
