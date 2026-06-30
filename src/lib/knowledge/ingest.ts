import type { RawInputSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/knowledge/chunker";
import { getEmbeddingProvider } from "@/lib/knowledge/embeddings";

export interface IngestArgs {
  organizationId: string;
  clientId: string;
  campaignId?: string | null;
  rawInputId?: string | null;
  title: string;
  sourceType: RawInputSourceType;
  sourceName?: string | null;
  content: string;
}

/**
 * Turn a piece of client information (usually a ClientRawInput) into a durable,
 * searchable KnowledgeDocument + KnowledgeChunks. The original raw input is left
 * untouched. Embeddings are computed only if a provider is configured; otherwise
 * chunks are stored embedding-free and served via keyword search.
 */
export async function ingestDocument(
  args: IngestArgs,
): Promise<{ documentId: string; chunkCount: number }> {
  const chunks = chunkText(args.content);

  // Optional embeddings (off by default — keyword search works without them).
  let embeddings: number[][] = [];
  const provider = getEmbeddingProvider();
  if (provider && chunks.length > 0) {
    try {
      embeddings = await provider.embed(chunks.map((c) => c.content));
    } catch {
      embeddings = [];
    }
  }

  const document = await prisma.knowledgeDocument.create({
    data: {
      organizationId: args.organizationId,
      clientId: args.clientId,
      campaignId: args.campaignId ?? null,
      rawInputId: args.rawInputId ?? null,
      title: args.title,
      sourceType: args.sourceType,
      sourceName: args.sourceName ?? null,
      content: args.content,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (chunks.length > 0) {
    await prisma.knowledgeChunk.createMany({
      data: chunks.map((c, i) => ({
        organizationId: args.organizationId,
        clientId: args.clientId,
        documentId: document.id,
        chunkIndex: c.index,
        content: c.content,
        embedding: embeddings[i] ?? [],
        metadata: { sourceType: args.sourceType, title: args.title },
      })),
    });
  }

  return { documentId: document.id, chunkCount: chunks.length };
}
