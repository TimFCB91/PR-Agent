import { prisma } from "@/lib/prisma";
import {
  ACCEPTED_STATUSES,
  DECLINED_STATUSES,
  CONTACTED_STATUSES,
  isFollowUpDue,
} from "@/lib/outreach/outreachManager";

export interface CampaignReport {
  topics: number;
  pitches: number;
  contacted: number;
  open: number;
  openFollowUps: number;
  interested: number;
  accepted: number;
  declined: number;
  articlesDelivered: number;
  publications: number;
}

/**
 * Aggregates the key PR numbers for a single campaign.
 *
 * Always scoped by BOTH campaignId and organizationId, so it is safe to call
 * from the authenticated dashboard as well as from the external read-only
 * report (which resolves the organizationId from the campaign's share token).
 */
export async function getCampaignReport(
  campaignId: string,
  organizationId: string,
): Promise<CampaignReport> {
  const where = { campaignId, organizationId };

  const [outreaches, topics, publications] = await Promise.all([
    prisma.outreach.findMany({
      where,
      select: { status: true, nextFollowUpDate: true },
    }),
    prisma.topicIdea.count({ where }),
    prisma.publication.count({ where }),
  ]);

  const count = (test: (o: (typeof outreaches)[number]) => boolean) =>
    outreaches.filter(test).length;

  return {
    topics,
    pitches: outreaches.length,
    contacted: count((o) => CONTACTED_STATUSES.includes(o.status)),
    open: count((o) => o.status === "DRAFT" || o.status === "READY"),
    openFollowUps: count((o) => isFollowUpDue(o.status, o.nextFollowUpDate)),
    interested: count((o) => o.status === "INTERESTED"),
    accepted: count((o) => ACCEPTED_STATUSES.includes(o.status)),
    declined: count((o) => DECLINED_STATUSES.includes(o.status)),
    articlesDelivered: count((o) => o.status === "ARTICLE_DELIVERED"),
    publications,
  };
}
