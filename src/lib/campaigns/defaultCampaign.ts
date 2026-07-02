import { prisma } from "@/lib/prisma";

/**
 * Return the client's campaign, creating a default one if none exists yet.
 *
 * Campaigns are an internal structuring concept the user shouldn't have to
 * manage by hand: every outreach must belong to one, so when a client has no
 * campaign we transparently create a single default ("Laufende Medienarbeit").
 * Reuses the existing (oldest) campaign, so it never creates duplicates.
 */
export async function getOrCreateDefaultCampaign(
  clientId: string,
  organizationId: string,
): Promise<{ id: string }> {
  const existing = await prisma.campaign.findFirst({
    where: { clientId, organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { name: true },
  });

  return prisma.campaign.create({
    data: {
      clientId,
      organizationId,
      name: client?.name ?? "Laufende Medienarbeit",
      status: "ACTIVE",
    },
    select: { id: true },
  });
}
