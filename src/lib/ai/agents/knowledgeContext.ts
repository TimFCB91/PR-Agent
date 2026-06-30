import { z } from "zod";

// Shared schemas so every agent accepts retrieved knowledge and returns source
// references + missing-info notes. Retrieval is a mandatory pre-step; agents
// must not rely solely on the current input and must never invent facts.

export const knowledgeChunkInput = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  sourceType: z.string(),
  content: z.string(),
});

export const sourceReferenceOutput = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  sourceType: z.string(),
  shortExcerpt: z.string(),
});

export type KnowledgeChunkInput = z.infer<typeof knowledgeChunkInput>;
export type SourceReferenceOutput = z.infer<typeof sourceReferenceOutput>;

/** Build source references (for the agent output) from the retrieved chunks. */
export function referencesFromChunks(
  chunks: KnowledgeChunkInput[],
): SourceReferenceOutput[] {
  return chunks.map((c) => ({
    documentId: c.documentId,
    chunkId: c.chunkId,
    sourceType: c.sourceType,
    shortExcerpt: c.content.replace(/\s+/g, " ").trim().slice(0, 160),
  }));
}

/** Missing-info note when retrieval found nothing usable. */
export function missingInfoFor(chunks: KnowledgeChunkInput[], topic: string): string[] {
  if (chunks.length > 0) return [];
  return [`Keine belastbaren gespeicherten Informationen zu „${topic}" gefunden.`];
}
