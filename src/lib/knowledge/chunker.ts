// Text chunker for the knowledge layer. Splits long text into context-friendly
// chunks along paragraph (then sentence) boundaries — never mid-word, and
// avoids arbitrary cuts. The implementation is intentionally swappable: callers
// depend only on `chunkText(text, options?)`.

export interface ChunkOptions {
  /** Target maximum chunk size in characters. */
  maxChars?: number;
  /** Overlap (characters) carried from the end of the previous chunk. */
  overlap?: number;
}

export interface Chunk {
  index: number;
  content: string;
}

const DEFAULTS: Required<ChunkOptions> = { maxChars: 1200, overlap: 150 };

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Break a single oversized paragraph into sentence-aligned pieces.
function packSentences(paragraph: string, maxChars: number): string[] {
  const sentences = splitSentences(paragraph);
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      pieces.push(current.trim());
      current = "";
    }
    // A single sentence longer than maxChars is kept whole (no mid-word cuts).
    current = current ? `${current} ${sentence}` : sentence;
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const { maxChars, overlap } = { ...DEFAULTS, ...options };
  const clean = text?.trim() ?? "";
  if (!clean) return [];

  // Group paragraphs together until they approach maxChars; split paragraphs
  // that are themselves too large along sentence boundaries.
  const units: string[] = [];
  for (const paragraph of splitParagraphs(clean)) {
    if (paragraph.length <= maxChars) {
      units.push(paragraph);
    } else {
      units.push(...packSentences(paragraph, maxChars));
    }
  }
  if (units.length === 0) units.push(clean);

  const blocks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > maxChars) {
      blocks.push(current.trim());
      // Carry a small overlap for context continuity.
      current = overlap > 0 ? current.slice(-overlap) + "\n\n" : "";
    }
    current = current ? `${current}\n\n${unit}` : unit;
  }
  if (current.trim()) blocks.push(current.trim());

  return blocks.map((content, index) => ({ index, content }));
}
