// Embedding-provider abstraction — prepared for semantic search but OFF by
// default, so keyword retrieval works before any embeddings exist. Enable later
// with EMBEDDINGS_PROVIDER (openai | voyage | local) + the relevant key, and
// switch KnowledgeChunk.embedding to pgvector for scale.

export interface EmbeddingProvider {
  readonly name: "openai" | "voyage" | "local";
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}

class OpenAIEmbeddings implements EmbeddingProvider {
  readonly name = "openai" as const;
  readonly dimension = 1536;
  constructor(
    private apiKey: string,
    private model = process.env.EMBEDDINGS_MODEL || "text-embedding-3-small",
  ) {}
  async embed(texts: string[]): Promise<number[][]> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: this.apiKey });
    const res = await client.embeddings.create({ model: this.model, input: texts });
    return res.data.map((d) => d.embedding as number[]);
  }
}

class VoyageEmbeddings implements EmbeddingProvider {
  readonly name = "voyage" as const;
  readonly dimension = 1024;
  constructor(
    private apiKey: string,
    private model = process.env.EMBEDDINGS_MODEL || "voyage-3",
  ) {}
  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((d) => d.embedding);
  }
}

class LocalEmbeddings implements EmbeddingProvider {
  readonly name = "local" as const;
  readonly dimension = Number(process.env.EMBEDDINGS_DIM) || 768;
  constructor(
    private baseUrl: string,
    private model = process.env.EMBEDDINGS_MODEL || "local-embed",
  ) {}
  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return json.data.map((d) => d.embedding);
  }
}

/** Returns the configured embedding provider, or null (keyword-only mode). */
export function getEmbeddingProvider(): EmbeddingProvider | null {
  const provider = process.env.EMBEDDINGS_PROVIDER;
  if (!provider || provider === "none") return null;
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings(process.env.OPENAI_API_KEY);
  }
  if (provider === "voyage" && process.env.VOYAGE_API_KEY) {
    return new VoyageEmbeddings(process.env.VOYAGE_API_KEY);
  }
  if (provider === "local" && process.env.EMBEDDINGS_BASE_URL) {
    return new LocalEmbeddings(process.env.EMBEDDINGS_BASE_URL);
  }
  return null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
