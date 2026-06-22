// The editorial checklist — criteria (A content, B style, C PR tone, D logic)
// expressed as data plus a runner that evaluates each against text metrics.
// editorialChecklist.ts turns these results into a score.

import type { TextAnalysis } from "@/lib/writing/textAnalyzer";
import type { EffectiveRules } from "@/lib/writing/rules";

export interface ChecklistContext {
  analysis: TextAnalysis;
  rules: EffectiveRules;
  factPassed: boolean;
  aiPatternPassed: boolean;
  claimProofPassed: boolean;
}

export interface CriterionResult {
  id: string;
  category: "A" | "B" | "C" | "D";
  label: string;
  ok: boolean;
  mustFix: boolean;
  weight: number;
  message?: string;
}

const AD_WORDS = [
  "jetzt zugreifen", "exklusives angebot", "gratis", "unschlagbar",
  "weltbeste", "marktführer", "branchenführer", "die nr. 1", "kostenlos testen",
];
const SUPERLATIVES = [
  "beste", "größte", "innovativste", "führend", "einzigartig", "revolutionär",
  "bahnbrechend",
];
const COMMON_ANGLICISMS = [
  "nice", "feature", "insights", "tool", "mindset", "game changer",
  "leverage", "deep dive", "learnings", "performance",
];

export function runChecklist(ctx: ChecklistContext): CriterionResult[] {
  const { analysis, rules } = ctx;
  const lower = analysis.text.toLowerCase();
  const wc = Math.max(1, analysis.wordCount);

  const results: CriterionResult[] = [];
  const add = (
    id: string,
    category: CriterionResult["category"],
    label: string,
    ok: boolean,
    weight: number,
    mustFix = false,
    message?: string,
  ) => results.push({ id, category, label, ok, mustFix, weight, message: ok ? undefined : message });

  // A. Inhalt --------------------------------------------------------------
  add(
    "A.facts", "A", "Keine erfundenen/unbelegten Fakten",
    ctx.factPassed, 4, true,
    "Es wurden nicht belegte Fakten, Zahlen, Zitate oder Quellen erkannt.",
  );
  add(
    "A.claims", "A", "Aussagen sind nachvollziehbar (Begründung + Beispiel)",
    ctx.claimProofPassed, 2, false,
    "Es gibt Behauptungen ohne Begründung oder Beispiel.",
  );
  add(
    "A.superlatives", "A", "Keine unbelegten Superlative",
    !SUPERLATIVES.some((s) => lower.includes(s)), 1, false,
    "Unbelegte Superlative gefunden.",
  );

  // B. Stil ----------------------------------------------------------------
  add(
    "B.avgLen", "B", "Kurze bis mittlere Sätze",
    analysis.avgSentenceLength <= rules.maxAvgSentenceLength, 2, false,
    `Durchschnittliche Satzlänge ${analysis.avgSentenceLength} Wörter (Ziel ≤ ${rules.maxAvgSentenceLength}).`,
  );
  add(
    "B.longSentences", "B", "Keine überlangen Sätze",
    analysis.longSentences.length === 0, 1, false,
    `${analysis.longSentences.length} überlange(r) Satz/Sätze.`,
  );
  add(
    "B.filler", "B", "Wenige Füllwörter",
    analysis.fillerWords.length <= 2, 1, false,
    `Füllwörter: ${analysis.fillerWords.join(", ")}.`,
  );
  add(
    "B.repetition", "B", "Keine Wortwiederholungen",
    analysis.repeatedWords.length === 0, 1, false,
    `Häufige Wiederholungen: ${analysis.repeatedWords.map((r) => r.word).join(", ")}.`,
  );
  add(
    "B.nominal", "B", "Wenig Nominalstil",
    analysis.nominalStyleCount / wc < 0.09, 1, false,
    "Hoher Nominalstil-Anteil.",
  );
  add(
    "B.passive", "B", "Aktiv statt passiv",
    analysis.passiveCount / wc < 0.05, 1, false,
    "Viele Passivkonstruktionen.",
  );
  if (!rules.allowAnglicisms) {
    add(
      "B.anglicisms", "B", "Keine unnötigen Anglizismen",
      !COMMON_ANGLICISMS.some((a) => lower.includes(a)), 1, false,
      "Unnötige Anglizismen gefunden.",
    );
  }

  // C. PR-Tonalität --------------------------------------------------------
  add(
    "C.notAdvertising", "C", "Redaktionell statt werblich",
    !AD_WORDS.some((a) => lower.includes(a)), 2, false,
    "Werbliche Sprache erkannt.",
  );
  add(
    "C.noAiPatterns", "C", "Keine KI-Floskeln",
    ctx.aiPatternPassed, 3, true,
    "KI-typische Floskeln/Muster erkannt.",
  );

  // D. Textlogik -----------------------------------------------------------
  add(
    "D.noDashStyle", "D", "Keine Gedankenstriche als Stilmittel",
    analysis.emDashCount === 0, 1, false,
    `${analysis.emDashCount} Gedankenstrich(e) als Stilmittel.`,
  );
  add(
    "D.noAntithesis", "D", "Keine künstlichen Antithesen",
    analysis.antitheses.length === 0, 1, false,
    "Künstliche Antithese (\"Es ist nicht X. Es ist Y.\") gefunden.",
  );
  add(
    "D.noTripleAdj", "D", "Keine Dreier-Adjektivketten",
    analysis.tripleAdjectives.length === 0, 1, false,
    `Dreier-Adjektivkette(n): ${analysis.tripleAdjectives.join("; ")}.`,
  );

  return results;
}
