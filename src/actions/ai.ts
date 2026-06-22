"use server";

import { revalidatePath } from "next/cache";
import type { Level } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { buildKnowledge } from "@/lib/ai/knowledge/knowledgeBuilder";
import { runTopicAgent } from "@/lib/ai/agents/topicAgent";
import { runBriefingAgent } from "@/lib/ai/agents/briefingAgent";
import { runArticleAgent } from "@/lib/ai/agents/articleAgent";
import { runMediaMatchingAgent } from "@/lib/ai/agents/mediaMatchingAgent";
import { runFollowUpAgent, type FollowUpAgentInput } from "@/lib/ai/agents/followUpAgent";
import {
  buildClientEvidence,
  getRuleSetForType,
  runAndStoreQuality,
} from "@/lib/quality/reportStore";
import { gatherKnowledge, saveSourceRefs } from "@/lib/knowledge/sources";
import {
  getAllTopicOutcomes,
  getContactStatsForMatching,
} from "@/lib/media/mediaIntelligence";

function revClient(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

async function getClient(clientId: string, organizationId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true, name: true, notes: true },
  });
}

/**
 * Build the central client knowledge + knowledge graph from all raw inputs.
 * Idempotent: rebuilds knowledge, nodes and edges for the client each run.
 */
export async function buildKnowledgeAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));
  const client = await getClient(clientId, tenant.organizationId);
  if (!client) return;

  const rawInputs = await prisma.clientRawInput.findMany({
    where: { clientId, organizationId: tenant.organizationId },
    select: { id: true, title: true, rawText: true, sourceType: true },
  });

  const { knowledge, nodes, edges } = buildKnowledge(
    rawInputs.map((r) => ({ ...r, sourceType: r.sourceType })),
  );

  await prisma.$transaction(async (tx) => {
    const scope = { clientId, organizationId: tenant.organizationId };
    await tx.knowledgeEdge.deleteMany({ where: scope });
    await tx.knowledgeNode.deleteMany({ where: scope });
    // Keep manually created/edited knowledge; only replace auto-built entries.
    await tx.clientKnowledge.deleteMany({ where: { ...scope, manual: false } });

    if (knowledge.length > 0) {
      await tx.clientKnowledge.createMany({
        data: knowledge.map((k) => ({ ...k, ...scope })),
      });
    }

    // Create nodes, remember key -> id, then create edges.
    const keyToId = new Map<string, string>();
    for (const node of nodes) {
      const created = await tx.knowledgeNode.create({
        data: {
          type: node.type,
          label: node.label,
          description: node.description,
          ...scope,
        },
        select: { id: true },
      });
      keyToId.set(node.key, created.id);
    }
    if (edges.length > 0) {
      await tx.knowledgeEdge.createMany({
        data: edges
          .map((e) => ({
            relation: e.relation,
            fromNodeId: keyToId.get(e.fromKey)!,
            toNodeId: keyToId.get(e.toKey)!,
            ...scope,
          }))
          .filter((e) => e.fromNodeId && e.toNodeId),
      });
    }
  });

  revClient(clientId);
}

/**
 * Topic agent: derive topic ideas from the client's knowledge.
 */
export async function generateTopicsFromKnowledgeAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));
  const client = await getClient(clientId, tenant.organizationId);
  if (!client) return;

  const knowledge = await prisma.clientKnowledge.findMany({
    where: { clientId, organizationId: tenant.organizationId },
    select: { category: true, title: true, content: true },
  });

  // Mandatory retrieval step.
  const gathered = await gatherKnowledge(
    clientId,
    tenant.organizationId,
    `${client.name} Themen Positionierung Expertise`,
  );

  const history = await getAllTopicOutcomes(tenant.organizationId);
  const result = await runTopicAgent(
    { clientName: client.name, knowledge, sources: gathered.chunks, history },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  // Create topics individually so each can carry its source references.
  for (const t of result.topics) {
    const topic = await prisma.topicIdea.create({
      data: {
        clientId,
        organizationId: tenant.organizationId,
        title: t.title,
        mediaAngle: t.mediaAngle,
        targetMediaType: t.targetMediaType,
        searchPotential: t.searchPotential as Level,
        newsValue: t.relevance as Level,
        priority: t.priority as Level,
        status: "DRAFT" as const,
      },
      select: { id: true },
    });
    await saveSourceRefs(
      "TOPIC",
      topic.id,
      tenant.organizationId,
      result.sourceReferences,
    );
  }

  revClient(clientId);
}

/**
 * Briefing agent: build a briefing from a topic + approved knowledge.
 */
export async function buildBriefingViaAgentAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const topic = await prisma.topicIdea.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: { client: { select: { name: true } } },
  });
  if (!topic) return;

  const knowledge = await prisma.clientKnowledge.findMany({
    where: { clientId: topic.clientId, organizationId: tenant.organizationId },
    select: { category: true, title: true },
  });

  const gathered = await gatherKnowledge(
    topic.clientId,
    tenant.organizationId,
    `${topic.title} ${topic.mediaAngle ?? ""}`,
    { campaignId: topic.campaignId },
  );

  const result = await runBriefingAgent(
    {
      clientName: topic.client.name,
      topicTitle: topic.title,
      topicDescription: topic.description,
      mediaAngle: topic.mediaAngle,
      targetMediaType: topic.targetMediaType,
      keyInsights: knowledge.filter((k) => k.category !== "NO_GO").map((k) => k.title),
      noGos: knowledge.filter((k) => k.category === "NO_GO").map((k) => k.title),
      sources: gathered.chunks,
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  const briefing = await prisma.briefing.create({
    data: {
      organizationId: tenant.organizationId,
      clientId: topic.clientId,
      campaignId: topic.campaignId,
      topicIdeaId: topic.id,
      status: "DRAFT",
      title: result.title,
      targetAudience: result.targetAudience,
      angle: topic.mediaAngle,
      keyMessages: result.keyMessages,
      suggestedStructure: result.structure,
      expertContext: result.expertContext,
      noGos: result.noGos,
    },
    select: { id: true },
  });

  await saveSourceRefs(
    "BRIEFING",
    briefing.id,
    tenant.organizationId,
    result.sourceReferences,
  );

  // Quality review of the briefing's key messages.
  await runAndStoreQuality({
    entityType: "BRIEFING",
    entityId: briefing.id,
    organizationId: tenant.organizationId,
    text: result.keyMessages,
    evidence: await buildClientEvidence(topic.clientId, tenant.organizationId),
    ruleSet: await getRuleSetForType(tenant.organizationId, "BRIEFING"),
  });

  await prisma.topicIdea.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "PITCHED" },
  });

  revClient(clientId);
}

/**
 * Article agent: write an article draft from a briefing, honouring the first
 * writing rule set.
 */
export async function buildArticleViaAgentAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const briefing = await prisma.briefing.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: { client: { select: { name: true } } },
  });
  if (!briefing) return;

  const ruleSet = await prisma.writingRuleSet.findFirst({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "asc" },
  });

  const gathered = await gatherKnowledge(
    briefing.clientId,
    tenant.organizationId,
    `${briefing.title} ${briefing.angle ?? ""}`,
    { campaignId: briefing.campaignId },
  );

  const result = await runArticleAgent(
    {
      clientName: briefing.client.name,
      briefingTitle: briefing.title,
      angle: briefing.angle,
      keyMessages: briefing.keyMessages,
      suggestedStructure: briefing.suggestedStructure,
      targetAudience: briefing.targetAudience,
      sources: gathered.chunks,
      rules: ruleSet
        ? {
            toneOfVoice: ruleSet.toneOfVoice,
            preferredStructure: ruleSet.preferredStructure,
            minWords: ruleSet.minWords,
            maxWords: ruleSet.maxWords,
            forbiddenPhrases: ruleSet.forbiddenPhrases,
          }
        : undefined,
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  const article = await prisma.articleDraft.create({
    data: {
      organizationId: tenant.organizationId,
      clientId: briefing.clientId,
      campaignId: briefing.campaignId,
      briefingId: briefing.id,
      status: "DRAFT",
      title: result.title,
      subtitle: result.subtitle,
      articleText: result.article,
      metaDescription: result.metaDescription,
    },
    select: { id: true },
  });

  // Article quality engine: run all checks. Hard fact problems -> needs review;
  // never auto-approve. The article goes to REVIEW unless it cannot be approved.
  const report = await runAndStoreQuality({
    entityType: "ARTICLE",
    entityId: article.id,
    organizationId: tenant.organizationId,
    text: result.article,
    evidence: await buildClientEvidence(briefing.clientId, tenant.organizationId),
    ruleSet: await getRuleSetForType(tenant.organizationId, "ARTICLE"),
  });

  await saveSourceRefs(
    "ARTICLE",
    article.id,
    tenant.organizationId,
    result.sourceReferences,
  );

  // Generated articles always land in REVIEW; approval is a manual quality step.
  void report;
  await prisma.articleDraft.updateMany({
    where: { id: article.id, organizationId: tenant.organizationId },
    data: { status: "REVIEW" },
  });

  await prisma.briefing.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "DELIVERED" },
  });

  revClient(clientId);
}

/**
 * Media matching agent: score org media contacts against a topic and create
 * DRAFT outreach entries for the best matches (topic must belong to a campaign).
 */
export async function matchAndCreateOutreachAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const topic = await prisma.topicIdea.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: { client: { select: { name: true, notes: true } } },
  });
  if (!topic || !topic.campaignId) return;

  // Media intelligence: contacts with their historical performance stats.
  const contacts = await getContactStatsForMatching(tenant.organizationId);
  if (contacts.length === 0) return;

  const gathered = await gatherKnowledge(
    topic.clientId,
    tenant.organizationId,
    topic.title,
    { campaignId: topic.campaignId },
  );

  const result = await runMediaMatchingAgent(
    {
      topic: {
        title: topic.title,
        targetMediaType: topic.targetMediaType,
        mediaAngle: topic.mediaAngle,
      },
      clientProfile: topic.client.notes ?? topic.client.name,
      mediaContacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        outlet: c.outlet,
        beat: c.beat,
        replyRate: c.replyRate,
        acceptanceRate: c.acceptanceRate,
        publicationRate: c.publicationRate,
        preferredAngles: c.preferredAngles,
        avoidedTopics: c.avoidedTopics,
        lastSuccessfulTopic: c.lastSuccessfulTopic,
      })),
      sources: gathered.chunks,
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  await saveSourceRefs(
    "MEDIA_MATCH",
    topic.id,
    tenant.organizationId,
    result.sourceReferences,
  );

  const top = result.matches.slice(0, 3);
  for (const match of top) {
    await prisma.outreach.create({
      data: {
        organizationId: tenant.organizationId,
        campaignId: topic.campaignId,
        mediaContactId: match.mediaContactId,
        subject: topic.title,
        status: "DRAFT",
        agreedTopic: topic.title,
        internalNotes: `Match-Score ${match.matchScore} · Historie ${match.historicalSuccessScore}: ${match.reason}\nVorgeschlagener Winkel: ${match.suggestedAngle}`,
      },
    });
  }

  revClient(clientId);
  revalidatePath("/dashboard/outreach");
}

/**
 * Follow-up agent: generate a follow-up email variant for an outreach.
 */
export async function generateFollowUpViaAgentAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const variant = String(formData.get("variant")) as FollowUpAgentInput["variant"];
  if (!["THREE_DAYS", "SEVEN_DAYS", "ACCEPTED", "DECLINED"].includes(variant)) {
    return;
  }

  const outreach = await prisma.outreach.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: {
      campaign: { select: { client: { select: { id: true, name: true } } } },
      mediaContact: { select: { firstName: true } },
    },
  });
  if (!outreach) return;

  const gathered = await gatherKnowledge(
    outreach.campaign.client.id,
    tenant.organizationId,
    outreach.agreedTopic ?? outreach.subject,
  );

  const result = await runFollowUpAgent(
    {
      variant,
      clientName: outreach.campaign.client.name,
      topicTitle: outreach.agreedTopic ?? outreach.subject,
      contactFirstName: outreach.mediaContact.firstName,
      sources: gathered.chunks,
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  await prisma.outreach.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { followUpEmail: result.message },
  });

  await saveSourceRefs(
    "FOLLOW_UP",
    id,
    tenant.organizationId,
    result.sourceReferences,
  );

  // Quality review of the follow-up.
  await runAndStoreQuality({
    entityType: "FOLLOW_UP",
    entityId: id,
    organizationId: tenant.organizationId,
    text: result.message,
    evidence: await buildClientEvidence(
      outreach.campaign.client.id,
      tenant.organizationId,
    ),
    ruleSet: await getRuleSetForType(tenant.organizationId, "FOLLOW_UP"),
  });

  revalidatePath("/dashboard/outreach");
}
