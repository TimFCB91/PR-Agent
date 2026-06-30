import { prisma } from "@/lib/prisma";
import {
  retrieveRelevantKnowledge,
  type SourceReference,
} from "@/lib/knowledge/retriever";

// Entity kinds that can carry source references.
export type SourceEntityType =
  | "TOPIC"
  | "PITCH"
  | "FOLLOW_UP"
  | "BRIEFING"
  | "ARTICLE"
  | "MEDIA_MATCH";

export interface GatheredKnowledge {
  evidenceText: string;
  references: SourceReference[];
  chunks: Array<{ documentId: string; chunkId: string; sourceType: string; content: string }>;
  empty: boolean;
}

/**
 * Mandatory pre-agent step: retrieve the relevant knowledge for a client/query
 * and return both an evidence corpus (for grounding + FactSafety) and the
 * source references to persist. Strictly organizationId-scoped.
 */
export async function gatherKnowledge(
  clientId: string,
  organizationId: string,
  query: string,
  opts?: { campaignId?: string | null; limit?: number },
): Promise<GatheredKnowledge> {
  const result = await retrieveRelevantKnowledge({
    clientId,
    organizationId,
    campaignId: opts?.campaignId ?? null,
    query,
    limit: opts?.limit ?? 6,
  });

  return {
    evidenceText: result.chunks.map((c) => c.content).join("\n\n"),
    references: result.references,
    chunks: result.chunks.map((c) => ({
      documentId: c.documentId,
      chunkId: c.chunkId,
      sourceType: c.sourceType,
      content: c.content,
    })),
    empty: result.empty,
  };
}

/** Replace the stored source references for an entity (tenant-scoped). */
export async function saveSourceRefs(
  entityType: SourceEntityType,
  entityId: string,
  organizationId: string,
  refs: SourceReference[],
): Promise<void> {
  await prisma.knowledgeSourceRef.deleteMany({
    where: { entityType, entityId, organizationId },
  });
  if (refs.length > 0) {
    await prisma.knowledgeSourceRef.createMany({
      data: refs.map((r) => ({
        entityType,
        entityId,
        organizationId,
        documentId: r.documentId,
        chunkId: r.chunkId,
        sourceType: r.sourceType,
        shortExcerpt: r.shortExcerpt,
      })),
    });
  }
}

export async function getSourceRefs(
  entityType: SourceEntityType,
  entityId: string,
  organizationId: string,
) {
  return prisma.knowledgeSourceRef.findMany({
    where: { entityType, entityId, organizationId },
    orderBy: { createdAt: "asc" },
  });
}
