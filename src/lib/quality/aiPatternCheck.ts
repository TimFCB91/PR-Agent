// Anti-AI-cliché check. Detects forbidden phrases plus structural AI tics
// (em-dash style, triple adjectives, artificial antitheses, generic closings).

import { analyzeText } from "@/lib/writing/textAnalyzer";
import { findForbiddenPhrases } from "@/lib/writing/forbiddenPhrases";

export interface AIPatternResult {
  passed: boolean;
  detectedPatterns: string[];
  severity: "low" | "medium" | "high";
  rewriteRequired: boolean;
}

export function aiPatternCheck(
  text: string,
  extraForbidden: string[] = [],
): AIPatternResult {
  const analysis = analyzeText(text);
  const detected: string[] = [];

  for (const phrase of findForbiddenPhrases(text, extraForbidden)) {
    detected.push(`Floskel: „${phrase}"`);
  }
  if (analysis.emDashCount > 0) {
    detected.push("Gedankenstrich als Stilmittel");
  }
  for (const triple of analysis.tripleAdjectives) {
    detected.push(`Dreier-Adjektivkette: „${triple}"`);
  }
  for (const anti of analysis.antitheses) {
    detected.push(`Künstliche Antithese: „${anti.slice(0, 50)}…"`);
  }

  const count = detected.length;
  const severity = count === 0 ? "low" : count <= 2 ? "medium" : "high";

  return {
    passed: count === 0,
    detectedPatterns: [...new Set(detected)],
    severity,
    rewriteRequired: count > 0,
  };
}
