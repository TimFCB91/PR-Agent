import { Prisma, type TextEntityType, type TextQualityStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  runQualityChecks,
  type QualityReport,
} from "@/lib/articles/articleQualityEngine";
import type { RuleSetInput } from "@/lib/writing/rules";

// Map a quality entity to the writing rule textType used to evaluate it.
const ENTITY_TEXT_TYPE: Record<TextEntityType, string> = {
  PITCH: "PITCH",
  FOLLOW_UP: "FOLLOW_UP",
  BRIEFING: "BRIEFING",
  ARTICLE: "ARTICLE",
};

/**
 * Concatenates everything the system actually knows about a client into one
 * evidence corpus. FactSafetyCheck uses this to verify that a generated text
 * contains no invented information.
 */
export async function buildClientEvidence(
  clientId: string,
  organizationId: string,
): Promise<string> {
  const scope = { clientId, organizationId };
  const [client, raw, insights, knowledge] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, organizationId },
      select: { name: true, notes: true, website: true },
    }),
    prisma.clientRawInput.findMany({
      where: scope,
      select: { title: true, rawText: true },
    }),
    prisma.clientInsight.findMany({
      where: scope,
      select: { title: true, content: true },
    }),
    prisma.clientKnowledge.findMany({
      where: scope,
      select: { title: true, content: true },
    }),
  ]);

  return [
    client?.name,
    client?.notes,
    client?.website,
    ...raw.map((r) => `${r.title} ${r.rawText ?? ""}`),
    ...insights.map((i) => `${i.title} ${i.content ?? ""}`),
    ...knowledge.map((k) => `${k.title} ${k.content ?? ""}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Picks the rule set matching a text type, else the org's first rule set. */
export async function getRuleSetForType(
  organizationId: string,
  entityType: TextEntityType,
): Promise<RuleSetInput | undefined> {
  const textType = ENTITY_TEXT_TYPE[entityType];
  const ruleSet =
    (await prisma.writingRuleSet.findFirst({
      where: { organizationId, textType: textType as never },
    })) ??
    (await prisma.writingRuleSet.findFirst({ where: { organizationId } }));

  if (!ruleSet) return undefined;
  return {
    textType: ruleSet.textType,
    toneOfVoice: ruleSet.toneOfVoice,
    rules: ruleSet.rules,
    forbiddenPhrases: ruleSet.forbiddenPhrases,
    requiredElements: ruleSet.requiredElements,
    preferredStructure: ruleSet.preferredStructure,
    minWords: ruleSet.minWords,
    maxWords: ruleSet.maxWords,
    allowGendering: ruleSet.allowGendering,
    allowAnglicisms: ruleSet.allowAnglicisms,
    allowFirstPerson: ruleSet.allowFirstPerson,
    allowDirectClientMention: ruleSet.allowDirectClientMention,
  };
}

/**
 * Runs the full quality engine over a generated text and upserts the report
 * (one per entity). Returns the report.
 */
export async function runAndStoreQuality(args: {
  entityType: TextEntityType;
  entityId: string;
  organizationId: string;
  text: string;
  evidence: string;
  ruleSet?: RuleSetInput;
}): Promise<QualityReport> {
  const report = runQualityChecks({
    text: args.text,
    evidence: args.evidence,
    ruleSet: args.ruleSet,
  });

  const json = report as unknown as Prisma.InputJsonValue;
  await prisma.textQualityReport.upsert({
    where: {
      entityType_entityId: {
        entityType: args.entityType,
        entityId: args.entityId,
      },
    },
    create: {
      entityType: args.entityType,
      entityId: args.entityId,
      organizationId: args.organizationId,
      status: report.status,
      score: report.score,
      canApprove: report.canApprove,
      report: json,
    },
    update: {
      status: report.status,
      score: report.score,
      canApprove: report.canApprove,
      report: json,
    },
  });

  return report;
}

/** Manually transition a report's status (approve / reject / revised). */
export async function setReportStatus(
  entityType: TextEntityType,
  entityId: string,
  organizationId: string,
  status: TextQualityStatus,
): Promise<void> {
  await prisma.textQualityReport.updateMany({
    where: { entityType, entityId, organizationId },
    data: { status },
  });
}
