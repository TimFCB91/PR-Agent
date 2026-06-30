import type { RawInputSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getEmbeddingProvider, cosineSimilarity } from "@/lib/knowledge/embeddings";

export interface SourceReference {
  documentId: string;
  chunkId: string;
  sourceType: string;
  shortExcerpt: string;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: RawInputSourceType;
  content: string;
  relevance: number; // 0-1
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  documents: Array<{ id: string; title: string; sourceType: RawInputSourceType }>;
  references: SourceReference[];
  /** True when nothing relevant was found — agents must then flag missing info. */
  empty: boolean;
}

export interface RetrievalQuery {
  clientId: string;
  organizationId: string;
  campaignId?: string | null;
  query: string;
  limit?: number;
}

const STOPWORDS = new Set([
  "und", "oder", "der", "die", "das", "ein", "eine", "mit", "für", "von",
  "den", "dem", "des", "ist", "sind", "wie", "was", "wer", "the", "and",
]);

function terms(query: string): string[] {
  return [
    ...new Set(
      (query.toLowerCase().match(/\p{L}+/gu) ?? [])
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    ),
  ];
}

// Keyword relevance: normalised term-frequency over the chunk.
function keywordScore(content: string, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0;
  const lower = content.toLowerCase();
  let hits = 0;
  for (const term of queryTerms) {
    const matches = lower.split(term).length - 1;
    if (matches > 0) hits += 1 + Math.min(matches - 1, 3) * 0.25;
  }
  return Math.min(1, hits / queryTerms.length);
}

function excerpt(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Retrieve the most relevant knowledge chunks for a client (optionally boosted
 * toward a campaign). Hybrid-ready: keyword scoring runs always; when an
 * embedding provider is configured and chunks carry embeddings, a semantic
 * score is blended in. Strictly organizationId-scoped.
 */
export async function retrieveRelevantKnowledge(
  q: RetrievalQuery,
): Promise<RetrievalResult> {
  const limit = q.limit ?? 6;

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      clientId: q.clientId,
      organizationId: q.organizationId,
      document: { status: "ACTIVE" },
    },
    include: {
      document: { select: { id: true, title: true, sourceType: true, campaignId: true } },
    },
  });

  if (chunks.length === 0) {
    return { chunks: [], documents: [], references: [], empty: true };
  }

  const queryTerms = terms(q.query);

  // Optional semantic layer (off unless configured + embeddings present).
  const provider = getEmbeddingProvider();
  let queryEmbedding: number[] | null = null;
  if (provider && chunks.some((c) => c.embedding.length > 0)) {
    try {
      queryEmbedding = (await provider.embed([q.query]))[0] ?? null;
    } catch {
      queryEmbedding = null;
    }
  }

  const scored = chunks.map((c) => {
    const keyword = keywordScore(c.content, queryTerms);
    const semantic =
      queryEmbedding && c.embedding.length > 0
        ? Math.max(0, cosineSimilarity(queryEmbedding, c.embedding))
        : 0;
    // Hybrid blend; falls back to pure keyword when no embeddings.
    let relevance = queryEmbedding ? 0.5 * keyword + 0.5 * semantic : keyword;
    // Campaign boost.
    if (q.campaignId && c.document.campaignId === q.campaignId) {
      relevance = Math.min(1, relevance + 0.1);
    }
    return { c, relevance };
  });

  const top = scored
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);

  const out: RetrievedChunk[] = top.map(({ c, relevance }) => ({
    chunkId: c.id,
    documentId: c.documentId,
    documentTitle: c.document.title,
    sourceType: c.document.sourceType,
    content: c.content,
    relevance: Math.round(relevance * 100) / 100,
  }));

  const docMap = new Map<string, { id: string; title: string; sourceType: RawInputSourceType }>();
  for (const r of out) {
    if (!docMap.has(r.documentId)) {
      docMap.set(r.documentId, {
        id: r.documentId,
        title: r.documentTitle,
        sourceType: r.sourceType,
      });
    }
  }

  const references: SourceReference[] = out.map((r) => ({
    documentId: r.documentId,
    chunkId: r.chunkId,
    sourceType: r.sourceType,
    shortExcerpt: excerpt(r.content),
  }));

  return {
    chunks: out,
    documents: [...docMap.values()],
    references,
    empty: out.length === 0,
  };
}
