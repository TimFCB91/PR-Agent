// Conservative rewrite engine. It only REMOVES or CLEANS problematic language
// (clichés, em-dash style, generic closings, triple adjectives, fillers, double
// spaces). It never adds facts, sources, quotes or new claims — so a rewrite can
// never introduce unsupported information.

import { FORBIDDEN_PHRASES } from "@/lib/writing/forbiddenPhrases";

const FILLER_WORDS = [
  "eigentlich", "quasi", "sozusagen", "letztendlich", "gewissermaßen",
  "irgendwie", "durchaus", "im grunde",
];

export interface RewriteResult {
  text: string;
  changes: string[];
  changed: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rewriteText(
  text: string,
  extraForbidden: string[] = [],
): RewriteResult {
  let result = text;
  const changes: string[] = [];

  // 1. Remove forbidden phrases (clichés).
  for (const phrase of [...FORBIDDEN_PHRASES, ...extraForbidden.map((p) => p.toLowerCase())]) {
    if (phrase.includes("...")) continue;
    const re = new RegExp(escapeRegExp(phrase), "gi");
    if (re.test(result)) {
      result = result.replace(re, "");
      changes.push(`Floskel entfernt: „${phrase}"`);
    }
  }

  // 2. Em/en dashes used as a stylistic device -> comma.
  if (/[—–]/.test(result)) {
    result = result.replace(/\s*[—–]\s*/g, ", ");
    changes.push("Gedankenstriche durch Kommas ersetzt");
  }

  // 3. Drop generic closing sentences.
  const before = result;
  result = result
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !/^(abschließend|zusammenfassend)\b/i.test(s.trim()))
    .join(" ");
  if (result !== before) changes.push("Generisches Fazit entfernt");

  // 4. Trim triple-adjective chains "a, b und c" -> "a und c".
  if (/(\p{L}+),\s+(\p{L}+)\s+und\s+(\p{L}+)/u.test(result)) {
    result = result.replace(/(\p{L}+),\s+(\p{L}+)\s+und\s+(\p{L}+)/gu, "$1 und $3");
    changes.push("Dreier-Adjektivketten gekürzt");
  }

  // 5. Remove a few filler words.
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${filler}\\b`, "gi");
    if (re.test(result)) {
      result = result.replace(re, "");
      changes.push(`Füllwort entfernt: „${filler}"`);
    }
  }

  // 6. Tidy whitespace/punctuation left behind.
  result = result
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/\n /g, "\n")
    .trim();

  return {
    text: result,
    changes: [...new Set(changes)],
    changed: result !== text,
  };
}
