import { prisma } from "@/lib/prisma";

/**
 * The topic pool is a special, non-browsable "client" per organization that
 * only holds imported pool topics (e.g. from Trello). It is excluded from the
 * normal client list and from matching candidates.
 */
export async function findTopicPool(organizationId: string) {
  return prisma.client.findFirst({
    where: { organizationId, isTopicPool: true },
  });
}

export async function getOrCreateTopicPool(organizationId: string) {
  const existing = await findTopicPool(organizationId);
  if (existing) return existing;
  return prisma.client.create({
    data: {
      organizationId,
      name: "Themenpool",
      isTopicPool: true,
      notes: "Interner Themenpool (z. B. aus Trello importiert).",
    },
  });
}
