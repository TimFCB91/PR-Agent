import type { InteractionType, InteractionResult } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  computeContactMetrics,
  computeTopicAngleRates,
  topicSimilarity,
  type OutreachRecord,
  type PublicationRecord,
} from "@/lib/media/mediaPerformanceCalculator";

const OUTREACH_SELECT = {
  status: true,
  sentAt: true,
  responseType: true,
  responseReceivedAt: true,
  rejectionReason: true,
  acceptedAngle: true,
  agreedTopic: true,
} as const;

const SENT_EXCLUDED = ["DRAFT", "READY"];
const ACCEPTED_STATUS = ["ACCEPTED", "ARTICLE_DELIVERED", "PUBLISHED"];

function isSent(o: OutreachRecord): boolean {
  return o.sentAt != null || !SENT_EXCLUDED.includes(o.status);
}
function isAccepted(o: OutreachRecord): boolean {
  return o.responseType === "ACCEPTED" || ACCEPTED_STATUS.includes(o.status);
}

/** Log a single interaction (the learning signal). Tenant-scoped. */
export async function recordInteraction(args: {
  organizationId: string;
  mediaContactId: string;
  outreachId?: string | null;
  interactionType: InteractionType;
  result?: InteractionResult | null;
  topicTitle?: string | null;
  mediaAngle?: string | null;
  notes?: string | null;
}): Promise<void> {
  await prisma.mediaInteraction.create({
    data: {
      organizationId: args.organizationId,
      mediaContactId: args.mediaContactId,
      outreachId: args.outreachId ?? null,
      interactionType: args.interactionType,
      result: args.result ?? null,
      topicTitle: args.topicTitle ?? null,
      mediaAngle: args.mediaAngle ?? null,
      notes: args.notes ?? null,
    },
  });
}

/**
 * Recompute and persist performance + preferences for one media contact from
 * its real history. Updates MediaPerformance, JournalistPreference and the
 * MediaContact cache fields. Strictly organizationId-scoped.
 */
export async function recomputeContact(
  mediaContactId: string,
  organizationId: string,
): Promise<void> {
  const contact = await prisma.mediaContact.findFirst({
    where: { id: mediaContactId, organizationId },
    select: { id: true },
  });
  if (!contact) return;

  const [outreaches, publications] = await Promise.all([
    prisma.outreach.findMany({
      where: { mediaContactId, organizationId },
      select: OUTREACH_SELECT,
    }),
    prisma.publication.findMany({
      where: { mediaContactId, organizationId },
      select: { resultingTopic: true, resultingAngle: true },
    }),
  ]);

  const metrics = computeContactMetrics(
    outreaches as OutreachRecord[],
    publications as PublicationRecord[],
  );

  const sent = (outreaches as OutreachRecord[]).filter(isSent);
  const totalPitches = sent.length;
  const totalReplies = sent.filter(
    (o) => o.responseType != null && o.responseType !== "NO_RESPONSE",
  ).length;
  const totalAcceptances = sent.filter(isAccepted).length;
  const totalPublications = publications.length;

  await prisma.mediaPerformance.upsert({
    where: { mediaContactId },
    create: {
      mediaContactId,
      organizationId,
      totalPitches,
      totalReplies,
      totalAcceptances,
      totalPublications,
      replyRate: metrics.replyRate ?? 0,
      acceptanceRate: metrics.acceptanceRate ?? 0,
      publicationRate: metrics.publicationRate ?? 0,
      averageResponseTimeHours: metrics.averageResponseTime,
    },
    update: {
      totalPitches,
      totalReplies,
      totalAcceptances,
      totalPublications,
      replyRate: metrics.replyRate ?? 0,
      acceptanceRate: metrics.acceptanceRate ?? 0,
      publicationRate: metrics.publicationRate ?? 0,
      averageResponseTimeHours: metrics.averageResponseTime,
    },
  });

  const preferredTopics = metrics.successfulTopics.map((t) => t.topic);
  await prisma.journalistPreference.upsert({
    where: { mediaContactId },
    create: {
      mediaContactId,
      organizationId,
      preferredTopics,
      preferredAngles: metrics.preferredAngles,
      avoidedTopics: metrics.avoidedTopics,
      preferredFormats: [],
      confidence: Math.min(100, totalPitches * 15),
    },
    update: {
      preferredTopics,
      preferredAngles: metrics.preferredAngles,
      avoidedTopics: metrics.avoidedTopics,
      confidence: Math.min(100, totalPitches * 15),
    },
  });

  // Update the denormalised cache on the contact for quick reads.
  await prisma.mediaContact.update({
    where: { id: mediaContactId },
    data: {
      replyRate: metrics.replyRate,
      acceptanceRate: metrics.acceptanceRate,
      publicationRate: metrics.publicationRate,
      averageResponseTime: metrics.averageResponseTime,
      lastSuccessfulTopic: metrics.lastSuccessfulTopic,
      preferredAngles: metrics.preferredAngles,
      avoidedTopics: metrics.avoidedTopics,
    },
  });
}

export async function recomputeAllContacts(organizationId: string): Promise<void> {
  const contacts = await prisma.mediaContact.findMany({
    where: { organizationId },
    select: { id: true },
  });
  for (const c of contacts) {
    await recomputeContact(c.id, organizationId);
  }
}

export interface ContactMatchStat {
  id: string;
  name: string;
  outlet: string | null;
  beat: string | null;
  replyRate: number;
  acceptanceRate: number;
  publicationRate: number;
  preferredAngles: string[];
  avoidedTopics: string[];
  preferredTopics: string[];
  lastSuccessfulTopic: string | null;
}

/** Per-contact stats for the media-matching / pitch agents. */
export async function getContactStatsForMatching(
  organizationId: string,
): Promise<ContactMatchStat[]> {
  const contacts = await prisma.mediaContact.findMany({
    where: { organizationId },
    include: { performance: true, preference: true },
  });
  return contacts.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    outlet: c.outlet,
    beat: c.beat,
    replyRate: c.performance?.replyRate ?? c.replyRate ?? 0,
    acceptanceRate: c.performance?.acceptanceRate ?? c.acceptanceRate ?? 0,
    publicationRate: c.performance?.publicationRate ?? c.publicationRate ?? 0,
    preferredAngles: c.preference?.preferredAngles ?? c.preferredAngles,
    avoidedTopics: c.preference?.avoidedTopics ?? c.avoidedTopics,
    preferredTopics: c.preference?.preferredTopics ?? [],
    lastSuccessfulTopic: c.lastSuccessfulTopic,
  }));
}

export async function getContactStatForPitch(
  mediaContactId: string,
  organizationId: string,
): Promise<ContactMatchStat | null> {
  const all = await getContactStatsForMatching(organizationId);
  return all.find((c) => c.id === mediaContactId) ?? null;
}

/** All past topic outcomes for an org (the topic agent compares per candidate). */
export async function getAllTopicOutcomes(
  organizationId: string,
): Promise<{ successes: string[]; failures: string[] }> {
  const outreaches = await prisma.outreach.findMany({
    where: { organizationId, agreedTopic: { not: null } },
    select: OUTREACH_SELECT,
  });
  const successes: string[] = [];
  const failures: string[] = [];
  for (const o of outreaches as OutreachRecord[]) {
    if (!o.agreedTopic) continue;
    if (isAccepted(o)) successes.push(o.agreedTopic);
    else if (o.responseType === "DECLINED") failures.push(o.agreedTopic);
  }
  return {
    successes: [...new Set(successes)],
    failures: [...new Set(failures)],
  };
}

/** Past outcomes for topics similar to a candidate title (uses topicSimilarity). */
export async function getSimilarTopicOutcomes(
  organizationId: string,
  title: string,
): Promise<{ successes: string[]; failures: string[] }> {
  const all = await getAllTopicOutcomes(organizationId);
  return {
    successes: all.successes.filter((t) => topicSimilarity(title, t) >= 0.34),
    failures: all.failures.filter((t) => topicSimilarity(title, t) >= 0.34),
  };
}

export interface CampaignMediaIntelligence {
  contacted: number;
  responded: number;
  accepted: number;
  published: number;
  replyRate: number;
  acceptanceRate: number;
  publicationRate: number;
  topMedia: Array<{ outlet: string; accepted: number }>;
  topTopics: Array<{ key: string; rate: number; attempts: number }>;
  topAngles: Array<{ key: string; rate: number; attempts: number }>;
  rejectionReasons: Array<{ reason: string; count: number }>;
}

export async function getCampaignMediaIntelligence(
  campaignId: string,
  organizationId: string,
): Promise<CampaignMediaIntelligence> {
  const outreaches = await prisma.outreach.findMany({
    where: { campaignId, organizationId },
    select: { ...OUTREACH_SELECT, mediaContact: { select: { outlet: true } } },
  });
  const publications = await prisma.publication.count({
    where: { campaignId, organizationId },
  });

  const records = outreaches as unknown as Array<
    OutreachRecord & { mediaContact: { outlet: string | null } }
  >;
  const sent = records.filter(isSent);
  const contacted = sent.length;
  const responded = sent.filter(
    (o) => o.responseType != null && o.responseType !== "NO_RESPONSE",
  ).length;
  const accepted = sent.filter(isAccepted).length;

  const pct = (n: number) => (contacted ? Math.round((n / contacted) * 1000) / 10 : 0);

  // Top outlets by acceptances.
  const outletAccept = new Map<string, number>();
  for (const o of sent) {
    if (!isAccepted(o)) continue;
    const outlet = o.mediaContact?.outlet?.trim();
    if (outlet) outletAccept.set(outlet, (outletAccept.get(outlet) ?? 0) + 1);
  }

  const { topics, angles } = computeTopicAngleRates(sent);

  const rejections = new Map<string, number>();
  for (const o of sent) {
    const r = o.rejectionReason?.trim();
    if (r) rejections.set(r, (rejections.get(r) ?? 0) + 1);
  }

  return {
    contacted,
    responded,
    accepted,
    published: publications,
    replyRate: pct(responded),
    acceptanceRate: pct(accepted),
    publicationRate: pct(publications),
    topMedia: [...outletAccept.entries()]
      .map(([outlet, n]) => ({ outlet, accepted: n }))
      .sort((a, b) => b.accepted - a.accepted)
      .slice(0, 5),
    topTopics: topics.slice(0, 5).map((t) => ({ key: t.key, rate: t.rate, attempts: t.attempts })),
    topAngles: angles.slice(0, 5).map((t) => ({ key: t.key, rate: t.rate, attempts: t.attempts })),
    rejectionReasons: [...rejections.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Org-wide pattern summary (KI preparation). Heuristic, human-readable lines —
 * the architecture is ready for a future recommendation model.
 */
export async function getOrgMediaIntelligenceSummary(
  organizationId: string,
): Promise<string[]> {
  const outreaches = await prisma.outreach.findMany({
    where: { organizationId },
    select: OUTREACH_SELECT,
  });
  const { topics, angles } = computeTopicAngleRates(outreaches as OutreachRecord[]);
  const lines: string[] = [];

  for (const t of topics.filter((x) => x.attempts >= 2)) {
    if (t.rate >= 60) lines.push(`Thema „${t.key}" erzielt hohe Zusageraten (${t.rate}%).`);
    else if (t.rate <= 20) lines.push(`Thema „${t.key}" wird selten angenommen (${t.rate}%).`);
  }
  for (const a of angles.filter((x) => x.attempts >= 2)) {
    if (a.rate >= 60) lines.push(`Winkel „${a.key}" funktioniert besonders gut (${a.rate}%).`);
  }
  if (lines.length === 0) {
    lines.push("Noch zu wenige Interaktionsdaten für belastbare Muster.");
  }
  return lines.slice(0, 8);
}
