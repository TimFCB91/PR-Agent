import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { buildBriefing } from "@/lib/briefings/briefingManager";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";

export const briefingInputSchema = z.object({
  clientName: z.string(),
  topicTitle: z.string().nullish(),
  topicDescription: z.string().nullish(),
  mediaAngle: z.string().nullish(),
  targetMediaType: z.string().nullish(),
  keyInsights: z.array(z.string()),
  noGos: z.array(z.string()),
});

export const briefingOutputSchema = z.object({
  title: z.string(),
  targetAudience: z.string(),
  keyMessages: z.string(),
  structure: z.string(),
  expertContext: z.string(),
  noGos: z.string(),
});

export type BriefingAgentInput = z.infer<typeof briefingInputSchema>;
export type BriefingAgentOutput = z.infer<typeof briefingOutputSchema>;

const definition: AgentDefinition<BriefingAgentInput, BriefingAgentOutput> = {
  name: "briefingAgent",
  inputSchema: briefingInputSchema,
  outputSchema: briefingOutputSchema,
  buildMessages: (input) => PROMPTS.briefingAgent(input),
  mock: (input) => {
    const b = buildBriefing({
      clientName: input.clientName,
      topicTitle: input.topicTitle,
      topicDescription: input.topicDescription,
      mediaAngle: input.mediaAngle,
      targetMediaType: input.targetMediaType,
      keyInsights: input.keyInsights,
      noGos: input.noGos,
    });
    return {
      title: b.title,
      targetAudience: b.targetAudience,
      keyMessages: b.keyMessages,
      structure: b.suggestedStructure,
      expertContext: b.expertContext,
      noGos: b.noGos,
    };
  },
};

export function runBriefingAgent(input: BriefingAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
