"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Level } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { deriveGraph } from "@/lib/ai/knowledge/knowledgeBuilder";
import {
  runKnowledgeAgent,
  normaliseCategory,
} from "@/lib/ai/agents/knowledgeAgent";
import { runTopicAgent } from "@/lib/ai/agents/topicAgent";
import { runTopicExtractAgent } from "@/lib/ai/agents/topicExtractAgent";
import { extractTextFromFile } from "@/lib/files/extractText";
import { runBriefingAgent } from "@/lib/ai/agents/briefingAgent";
import { runArticleAgent } from "@/lib/ai/agents/articleAgent";
import { runMediaMatchingAgent } from "@/lib/ai/agents/mediaMatchingAgent";
import { runFollowUpAgent, type FollowUpAgentInput } from "@/lib/ai/agents/followUpAgent";
import { fallbackNotice } from "@/lib/ai/agents/runAgent";
import type { FormState } from "@/lib/form";
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
 * Core: rebuild the central client knowledge + graph from all raw inputs via
 * the real AI knowledge agent. Returns how many entries were created and
 * whether the AI fell back to the deterministic placeholder.
 *
 * @param wipeManual when true, also delete manually created/edited entries
 *   (a full reset); otherwise manual entries are preserved.
 */
async function rebuildClientKnowledge(
  clientId: string,
  organizationId: string,
  userId: string | undefined,
  opts: { wipeManual?: boolean } = {},
): Promise<{ created: number; usedFallback: boolean; error?: string }> {
  const client = await getClient(clientId, organizationId);
  if (!client) return { created: 0, usedFallback: false, error: "Kunde nicht gefunden." };

  const rawInputs = await prisma.clientRawInput.findMany({
    where: { clientId, organizationId },
    select: { id: true, title: true, rawText: true, sourceType: true },
  });

  // Stable refs (d0, d1, …) so the model can cite which document each entry
  // came from; mapped back to real ids afterwards.
  const refToId = new Map<string, string>();
  const documents = rawInputs.map((r, i) => {
    const ref = `d${i}`;
    refToId.set(ref, r.id);
    // Cap each document so several long files stay within the model context.
    return { ref, title: r.title, text: (r.rawText ?? "").slice(0, 12000) };
  });

  const run = await runKnowledgeAgent(
    { clientName: client.name, notes: client.notes, documents },
    { organizationId, userId },
  );

  const knowledge = run.output.knowledge
    .map((k) => ({
      category: normaliseCategory(k.category),
      title: k.title.trim().slice(0, 200),
      content: (k.content ?? "").trim(),
      confidence: Math.round(k.confidence ?? 60),
      sourceIds: (k.sources ?? [])
        .map((s) => refToId.get(s))
        .filter(Boolean) as string[],
    }))
    .filter((k) => k.title.length > 0);
  const { nodes, edges } = deriveGraph(knowledge);

  const mediaAreas = [
    ...new Set(
      (run.output.mediaAreas ?? [])
        .map((a) => a.trim())
        .filter((a) => a.length > 1 && a.length <= 40),
    ),
  ].slice(0, 12);

  await prisma.$transaction(async (tx) => {
    const scope = { clientId, organizationId };
    await tx.client.updateMany({
      where: { id: clientId, organizationId },
      data: { mediaAreas },
    });
    await tx.knowledgeEdge.deleteMany({ where: scope });
    await tx.knowledgeNode.deleteMany({ where: scope });
    // Replace auto-built entries; keep manual ones unless a full reset.
    await tx.clientKnowledge.deleteMany({
      where: opts.wipeManual ? scope : { ...scope, manual: false },
    });

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
  return {
    created: knowledge.length,
    usedFallback: run.usedFallback,
    error: run.error,
  };
}

/**
 * Build the central client knowledge + knowledge graph from all raw inputs.
 * Idempotent: rebuilds knowledge, nodes and edges for the client each run.
 */
export async function buildKnowledgeAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));
  await rebuildClientKnowledge(clientId, tenant.organizationId, tenant.userId);
}

export interface KnowledgeBuildState extends FormState {
  created?: number;
  usedFallback?: boolean;
}

/**
 * One-click "Wissen per KI neu aufbauen": wipes the AI-generated knowledge and
 * regenerates it from the current raw inputs. Surfaces whether real AI was used
 * or it fell back to the placeholder, so the result is never silently wrong.
 */
export async function rebuildKnowledgeAction(
  clientId: string,
  _prev: KnowledgeBuildState,
  formData: FormData,
): Promise<KnowledgeBuildState> {
  const tenant = await requireWriteAccess();
  const wipeManual = String(formData.get("wipeManual") ?? "") === "true";

  let result;
  try {
    result = await rebuildClientKnowledge(
      clientId,
      tenant.organizationId,
      tenant.userId,
      { wipeManual },
    );
  } catch (e) {
    return {
      ok: false,
      error:
        "Neuaufbau fehlgeschlagen: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  if (result.error && result.usedFallback) {
    return {
      ok: false,
      created: result.created,
      usedFallback: true,
      error: fallbackNotice({ usedFallback: true, error: result.error }),
    };
  }

  return { ok: true, created: result.created, usedFallback: false };
}

/**
 * Core: (re)generate topic ideas from the client's knowledge via the topic
 * agent. Removes the previously auto-generated, still-untouched (DRAFT) topics
 * so repeated runs don't pile up duplicates, while preserving manual topics and
 * any topic that already progressed. Returns count + AI fallback status.
 */
async function regenerateClientTopics(
  clientId: string,
  organizationId: string,
  userId: string | undefined,
): Promise<{ created: number; usedFallback: boolean; error?: string }> {
  const client = await getClient(clientId, organizationId);
  if (!client) return { created: 0, usedFallback: false, error: "Kunde nicht gefunden." };

  const knowledge = await prisma.clientKnowledge.findMany({
    where: { clientId, organizationId },
    select: { category: true, title: true, content: true },
  });

  // Mandatory retrieval step.
  const gathered = await gatherKnowledge(
    clientId,
    organizationId,
    `${client.name} Themen Positionierung Expertise`,
  );

  const history = await getAllTopicOutcomes(organizationId);
  const run = await runTopicAgent(
    { clientName: client.name, knowledge, sources: gathered.chunks, history },
    { organizationId, userId },
  );
  const result = run.output;

  // Replace the untouched auto-generated topics (keep manual + progressed ones).
  await prisma.topicIdea.deleteMany({
    where: { clientId, organizationId, manual: false, status: "DRAFT" },
  });

  // Create topics individually so each can carry its source references.
  for (const t of result.topics) {
    const description =
      [t.description, t.historicalNote].filter(Boolean).join("\n\n") || undefined;
    const topic = await prisma.topicIdea.create({
      data: {
        clientId,
        organizationId,
        title: t.title,
        description,
        mediaAngle: t.mediaAngle,
        targetMediaType: t.targetMediaType,
        searchPotential: t.searchPotential as Level,
        newsValue: t.relevance as Level,
        priority: t.priority as Level,
        status: "DRAFT" as const,
      },
      select: { id: true },
    });
    await saveSourceRefs("TOPIC", topic.id, organizationId, result.sourceReferences);
  }

  revClient(clientId);
  return {
    created: result.topics.length,
    usedFallback: run.usedFallback,
    error: run.error,
  };
}

/**
 * Topic agent: derive topic ideas from the client's knowledge.
 */
export async function generateTopicsFromKnowledgeAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));
  await regenerateClientTopics(clientId, tenant.organizationId, tenant.userId);
}

export interface TopicsBuildState extends FormState {
  created?: number;
  usedFallback?: boolean;
}

export interface TopicImportState extends TopicsBuildState {
  fileName?: string;
}

/**
 * Import topics from an uploaded document (Word/PDF/text): the AI extracts the
 * topics proposed in the file and adds them as topic ideas. Imported topics are
 * marked manual so the "neu generieren" step won't wipe them.
 */
export async function importTopicsFromFileAction(
  clientId: string,
  _prev: TopicImportState,
  formData: FormData,
): Promise<TopicImportState> {
  const tenant = await requireWriteAccess();
  const client = await getClient(clientId, tenant.organizationId);
  if (!client) return { ok: false, error: "Kunde nicht gefunden." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Datei auswählen." };
  }

  let extracted;
  try {
    extracted = await extractTextFromFile(file);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.",
    };
  }
  if (!extracted.text) {
    return { ok: false, error: "Aus der Datei konnte kein Text gelesen werden." };
  }

  const run = await runTopicExtractAgent(
    {
      clientName: client.name,
      documentTitle: extracted.fileName,
      documentText: extracted.text.slice(0, 16000),
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );

  if (run.usedFallback && run.error) {
    return {
      ok: false,
      usedFallback: true,
      error: fallbackNotice({ usedFallback: true, error: run.error }),
    };
  }

  const topics = run.output.topics;
  if (topics.length === 0) {
    return { ok: false, error: "Im Dokument wurden keine Themen gefunden." };
  }

  await prisma.topicIdea.createMany({
    data: topics.map((t) => ({
      clientId,
      organizationId: tenant.organizationId,
      title: t.title.slice(0, 200),
      description:
        [t.description, `Importiert aus: ${extracted.fileName}`]
          .filter(Boolean)
          .join("\n\n") || undefined,
      mediaAngle: t.mediaAngle || undefined,
      targetMediaType: t.targetMediaType || undefined,
      searchPotential: (t.searchPotential ?? "MEDIUM") as Level,
      newsValue: (t.newsValue ?? "MEDIUM") as Level,
      priority: (t.priority ?? "MEDIUM") as Level,
      status: "DRAFT" as const,
      manual: true,
    })),
  });

  revClient(clientId);
  return {
    ok: true,
    created: topics.length,
    usedFallback: false,
    fileName: extracted.fileName,
  };
}

/**
 * One-click "Themen per KI neu generieren": rebuilds the topic ideas from the
 * client's current knowledge and surfaces whether real AI was used.
 */
export async function rebuildTopicsAction(
  clientId: string,
  _prev: TopicsBuildState,
  formData: FormData,
): Promise<TopicsBuildState> {
  const tenant = await requireWriteAccess();
  void formData;

  let result;
  try {
    result = await regenerateClientTopics(
      clientId,
      tenant.organizationId,
      tenant.userId,
    );
  } catch (e) {
    return {
      ok: false,
      error:
        "Themen-Generierung fehlgeschlagen: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  if (result.error && result.usedFallback) {
    return {
      ok: false,
      created: result.created,
      usedFallback: true,
      error: fallbackNotice({ usedFallback: true, error: result.error }),
    };
  }

  return { ok: true, created: result.created, usedFallback: false };
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

  const run = await runBriefingAgent(
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
  const result = run.output;
  const notice = fallbackNotice(run);

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
      expertContext: [notice, result.expertContext].filter(Boolean).join("\n\n"),
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

  // Quality review of the briefing's key messages (best-effort — must not
  // break the workflow or block the redirect).
  try {
    await runAndStoreQuality({
      entityType: "BRIEFING",
      entityId: briefing.id,
      organizationId: tenant.organizationId,
      text: result.keyMessages,
      evidence: await buildClientEvidence(topic.clientId, tenant.organizationId),
      ruleSet: await getRuleSetForType(tenant.organizationId, "BRIEFING"),
    });
  } catch {
    // ignore quality-check failures
  }

  await prisma.topicIdea.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "PITCHED" },
  });

  revClient(clientId);
  // Jump straight to the Briefings tab so the new briefing is shown.
  redirect(`/dashboard/clients/${clientId}?tab=briefings`);
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

  const run = await runArticleAgent(
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
  const result = run.output;
  const notice = fallbackNotice(run);

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

  // Quality gate: a fact-unsafe draft is NOT moved forward — it stays DRAFT and
  // is clearly flagged. Only fact-safe drafts advance to REVIEW for the human
  // approval step. The result is summarised into qualityNotes so it's visible
  // in the article list.
  const factRisk = !report.factSafety.passed;
  const qualitySummary =
    `Qualität: Score ${report.score}/100 · ` +
    (report.canApprove ? "freigabefähig" : "noch nicht freigabefähig") +
    (factRisk ? " · ⚠️ FAKTENRISIKO: bitte Quellen prüfen" : "");
  await prisma.articleDraft.updateMany({
    where: { id: article.id, organizationId: tenant.organizationId },
    data: {
      status: factRisk ? "DRAFT" : "REVIEW",
      qualityNotes: [notice, qualitySummary].filter(Boolean).join("\n"),
    },
  });

  await prisma.briefing.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "DELIVERED" },
  });

  revClient(clientId);
  // Jump straight to the Artikel tab so the new draft is shown.
  redirect(`/dashboard/clients/${clientId}?tab=articles`);
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

  const run = await runMediaMatchingAgent(
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
  const result = run.output;
  const notice = fallbackNotice(run);

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
        internalNotes: [
          notice,
          `Match-Score ${match.matchScore}${
            match.historicalSuccessScore != null
              ? ` · Historie ${match.historicalSuccessScore}`
              : ""
          }: ${match.reason}\nVorgeschlagener Winkel: ${match.suggestedAngle}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }

  revClient(clientId);
  revalidatePath("/dashboard/outreach");
  // Jump straight to the Outreach tab so the new entries are shown.
  redirect(`/dashboard/clients/${clientId}?tab=outreach`);
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

  const run = await runFollowUpAgent(
    {
      variant,
      clientName: outreach.campaign.client.name,
      topicTitle: outreach.agreedTopic ?? outreach.subject,
      contactFirstName: outreach.mediaContact.firstName,
      sources: gathered.chunks,
    },
    { organizationId: tenant.organizationId, userId: tenant.userId },
  );
  const result = run.output;
  const notice = fallbackNotice(run);

  await prisma.outreach.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      followUpEmail: [notice, result.message].filter(Boolean).join("\n\n"),
    },
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
