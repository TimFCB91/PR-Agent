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
    await tx.clientKnowledge.deleteMany({ where: scope });

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

  const result = await runTopicAgent(
    { clientName: client.name, knowledge },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  if (result.topics.length > 0) {
    await prisma.topicIdea.createMany({
      data: result.topics.map((t) => ({
        clientId,
        organizationId: tenant.organizationId,
        title: t.title,
        mediaAngle: t.mediaAngle,
        targetMediaType: t.targetMediaType,
        searchPotential: t.searchPotential as Level,
        newsValue: t.relevance as Level,
        priority: t.priority as Level,
        status: "DRAFT" as const,
      })),
    });
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

  const result = await runBriefingAgent(
    {
      clientName: topic.client.name,
      topicTitle: topic.title,
      topicDescription: topic.description,
      mediaAngle: topic.mediaAngle,
      targetMediaType: topic.targetMediaType,
      keyInsights: knowledge.filter((k) => k.category !== "NO_GO").map((k) => k.title),
      noGos: knowledge.filter((k) => k.category === "NO_GO").map((k) => k.title),
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  await prisma.briefing.create({
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

  const result = await runArticleAgent(
    {
      clientName: briefing.client.name,
      briefingTitle: briefing.title,
      angle: briefing.angle,
      keyMessages: briefing.keyMessages,
      suggestedStructure: briefing.suggestedStructure,
      targetAudience: briefing.targetAudience,
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

  await prisma.articleDraft.create({
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

  const contacts = await prisma.mediaContact.findMany({
    where: { organizationId: tenant.organizationId },
    select: { id: true, firstName: true, lastName: true, outlet: true, beat: true },
  });
  if (contacts.length === 0) return;

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
        name: `${c.firstName} ${c.lastName}`,
        outlet: c.outlet,
        beat: c.beat,
      })),
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
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
        internalNotes: `Match-Score ${match.matchScore}: ${match.reason}\nVorgeschlagener Winkel: ${match.suggestedAngle}`,
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
      campaign: { select: { client: { select: { name: true } } } },
      mediaContact: { select: { firstName: true } },
    },
  });
  if (!outreach) return;

  const result = await runFollowUpAgent(
    {
      variant,
      clientName: outreach.campaign.client.name,
      topicTitle: outreach.agreedTopic ?? outreach.subject,
      contactFirstName: outreach.mediaContact.firstName,
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  await prisma.outreach.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { followUpEmail: result.message },
  });

  revalidatePath("/dashboard/outreach");
}
