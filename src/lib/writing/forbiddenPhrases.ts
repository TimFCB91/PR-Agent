// Central anti-AI-cliché list. Used by aiPatternCheck and the rewrite engine,
// and merged with per-rule-set forbidden phrases from the database.

export const FORBIDDEN_PHRASES: string[] = [
  "in der heutigen zeit",
  "in einer welt, in der",
  "wichtiger denn je",
  "immer mehr menschen fragen sich",
  "es ist wichtig zu beachten",
  "viele experten sind sich einig",
  "ein guter weg ist",
  "nicht nur ... sondern auch",
  "präzise",
  "umfassend",
  "ganzheitlich",
  "eintauchen",
  "dies zeigt",
  "dies verdeutlicht",
  "es bleibt spannend",
  "abschließend lässt sich sagen",
  "zusammenfassend lässt sich sagen",
  "jeder kleine schritt zählt",
  "zahlreiche vorteile",
  "innovative lösung",
  "maßgeschneiderte lösung",
  "zukunftsorientiert",
  "effizient, skalierbar und nachhaltig",
  "sorgt für aufsehen",
  "rückt in den fokus",
  "steht im fokus",
  "gewinnt zunehmend an bedeutung",
];

// "nicht nur ... sondern auch" needs a regex (the "..." is a gap).
export const FORBIDDEN_REGEXES: Array<{ label: string; regex: RegExp }> = [
  { label: "nicht nur … sondern auch", regex: /nicht nur\b[^.!?]*\bsondern auch\b/gi },
];

/** Returns the forbidden phrases found in a text (lowercased matches). */
export function findForbiddenPhrases(text: string, extra: string[] = []): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];

  for (const phrase of [...FORBIDDEN_PHRASES, ...extra.map((p) => p.toLowerCase())]) {
    // Skip the gapped phrase here; handled by regex below.
    if (phrase.includes("...")) continue;
    if (lower.includes(phrase)) hits.push(phrase);
  }
  for (const { label, regex } of FORBIDDEN_REGEXES) {
    if (regex.test(text)) hits.push(label);
  }
  return [...new Set(hits)];
}
