import { z } from "zod";

import { PROMPTS } from "@/lib/ai/prompts";
import { generateFollowUpEmail } from "@/lib/outreach/outreachManager";
import { runAgent, type AgentContext, type AgentDefinition } from "@/lib/ai/agents/runAgent";

// The four supported follow-up variants.
export const followUpVariant = z.enum([
  "THREE_DAYS",
  "SEVEN_DAYS",
  "ACCEPTED",
  "DECLINED",
]);

export const followUpInputSchema = z.object({
  variant: followUpVariant,
  clientName: z.string(),
  topicTitle: z.string().nullish(),
  contactFirstName: z.string().nullish(),
});

export const followUpOutputSchema = z.object({
  subject: z.string(),
  message: z.string(),
});

export type FollowUpAgentInput = z.infer<typeof followUpInputSchema>;
export type FollowUpAgentOutput = z.infer<typeof followUpOutputSchema>;

const SUBJECTS: Record<z.infer<typeof followUpVariant>, string> = {
  THREE_DAYS: "Kurzes Nachfassen",
  SEVEN_DAYS: "Nochmals zu meinem Themenvorschlag",
  ACCEPTED: "Danke – die nächsten Schritte",
  DECLINED: "Danke für Ihre Rückmeldung",
};

function mockMessage(input: FollowUpAgentInput): string {
  const greeting = input.contactFirstName
    ? `Hallo ${input.contactFirstName},`
    : "Sehr geehrte Damen und Herren,";
  const topic = input.topicTitle ?? "meinen Themenvorschlag";
  switch (input.variant) {
    case "ACCEPTED":
      return `${greeting}\n\nvielen Dank für die Zusage zu „${topic}". Ich sende Ihnen umgehend alle Unterlagen und einen Entwurf.\n\nBeste Grüße`;
    case "DECLINED":
      return `${greeting}\n\ndanke für Ihre Rückmeldung zu „${topic}". Ich melde mich gerne, sobald ich ein passenderes Thema für Sie habe.\n\nBeste Grüße`;
    default:
      return generateFollowUpEmail({
        clientName: input.clientName,
        topicTitle: input.topicTitle,
        contactFirstName: input.contactFirstName,
      });
  }
}

const definition: AgentDefinition<FollowUpAgentInput, FollowUpAgentOutput> = {
  name: "followUpAgent",
  inputSchema: followUpInputSchema,
  outputSchema: followUpOutputSchema,
  buildMessages: (input) => PROMPTS.followUpAgent(input),
  mock: (input) => ({
    subject: SUBJECTS[input.variant],
    message: mockMessage(input),
  }),
};

export function runFollowUpAgent(input: FollowUpAgentInput, ctx: AgentContext) {
  return runAgent(definition, input, ctx);
}
