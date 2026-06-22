// Low-level text metrics shared by every quality check. Pure, language-aware
// (German) heuristics — no AI needed. Real AI can later enrich these signals
// without changing the consumers.

export interface SentenceInfo {
  text: string;
  wordCount: number;
}

export interface TextAnalysis {
  text: string;
  wordCount: number;
  sentences: SentenceInfo[];
  avgSentenceLength: number;
  longSentences: SentenceInfo[]; // > 25 words
  paragraphCount: number;
  passiveCount: number;
  nominalStyleCount: number;
  fillerWords: string[];
  repeatedWords: Array<{ word: string; count: number }>;
  emDashCount: number;
  tripleAdjectives: string[];
  antitheses: string[];
}

export const LONG_SENTENCE_WORDS = 25;

// German filler words ("Füllwörter").
const FILLER_WORDS = [
  "eigentlich", "quasi", "sozusagen", "natürlich", "letztendlich",
  "im grunde", "gewissermaßen", "irgendwie", "relativ", "ziemlich",
  "durchaus", "schließlich", "tatsächlich", "wirklich", "einfach",
  "halt", "eben", "wohl", "nun", "ja",
];

// Passive-voice markers (auxiliary + participle indicators).
const PASSIVE_MARKERS = /\b(wird|werden|wurde|wurden|worden|geworden)\b/gi;

// Nominal-style suffixes (over-nominalisation).
const NOMINAL_SUFFIX = /\w+(ung|heit|keit|tion|ismus|ierung)\b/gi;

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function analyzeText(text: string): TextAnalysis {
  const lower = text.toLowerCase();
  const sentences = splitSentences(text).map((s) => ({
    text: s,
    wordCount: countWords(s),
  }));
  const wordCount = countWords(text);
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const longSentences = sentences.filter((s) => s.wordCount > LONG_SENTENCE_WORDS);
  const avgSentenceLength = sentences.length
    ? Math.round(wordCount / sentences.length)
    : 0;

  const passiveCount = (text.match(PASSIVE_MARKERS) ?? []).length;
  const nominalStyleCount = (text.match(NOMINAL_SUFFIX) ?? []).length;

  const fillerWords = FILLER_WORDS.filter((f) => lower.includes(f));

  // Repeated content words (length > 5, more than 3 occurrences).
  const counts = new Map<string, number>();
  for (const raw of lower.match(/\p{L}+/gu) ?? []) {
    if (raw.length > 5) counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  const repeatedWords = [...counts.entries()]
    .filter(([, c]) => c > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Em/en dashes used as a stylistic device.
  const emDashCount = (text.match(/[—–]/g) ?? []).length;

  // Triple-adjective chains: "a, b und c".
  const tripleAdjectives = [
    ...text.matchAll(/(\p{L}+),\s+(\p{L}+)\s+und\s+(\p{L}+)/gu),
  ].map((m) => m[0]);

  // Artificial antithesis: "Es ist nicht X. Es ist Y."
  const antitheses = [
    ...text.matchAll(/\bes ist nicht\b[^.!?]*[.!?]\s*es ist\b[^.!?]*[.!?]/gi),
  ].map((m) => m[0]);

  return {
    text,
    wordCount,
    sentences,
    avgSentenceLength,
    longSentences,
    paragraphCount: paragraphs.length,
    passiveCount,
    nominalStyleCount,
    fillerWords,
    repeatedWords,
    emDashCount,
    tripleAdjectives,
    antitheses,
  };
}
