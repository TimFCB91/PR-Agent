// Central writing-rule resolver. Merges a (DB) WritingRuleSet with the built-in
// style profile for its text type into one effective rule set every quality
// check and the rewrite engine consume. This is the single source of truth all
// agents share.

import {
  getStyleProfile,
  type StyleProfile,
  type TextType,
} from "@/lib/writing/styleProfiles";
import { FORBIDDEN_PHRASES } from "@/lib/writing/forbiddenPhrases";

// Subset of WritingRuleSet fields the engine needs (kept Prisma-free so the
// rules stay pure and testable; actions map DB rows onto this).
export interface RuleSetInput {
  textType?: string | null;
  toneOfVoice?: string | null;
  rules?: string | null;
  forbiddenPhrases?: string[];
  requiredElements?: string[];
  preferredStructure?: string | null;
  minWords?: number | null;
  maxWords?: number | null;
  allowGendering?: boolean | null;
  allowAnglicisms?: boolean | null;
  allowFirstPerson?: boolean | null;
  allowDirectClientMention?: boolean | null;
}

export interface EffectiveRules {
  textType: TextType;
  tone: string;
  maxAvgSentenceLength: number;
  maxSentenceWords: number;
  requiredElements: string[];
  forbiddenPhrases: string[];
  preferredStructure?: string;
  minWords?: number;
  maxWords?: number;
  allowAnglicisms: boolean;
  allowFirstPerson: boolean;
  allowDirectClientMention: boolean;
  allowGendering: boolean;
}

export const MAX_SENTENCE_WORDS = 30;

export function resolveRules(input?: RuleSetInput): EffectiveRules {
  const profile: StyleProfile = getStyleProfile(input?.textType);

  return {
    textType: profile.textType,
    tone: input?.toneOfVoice?.trim() || profile.tone,
    maxAvgSentenceLength: profile.maxAvgSentenceLength,
    maxSentenceWords: MAX_SENTENCE_WORDS,
    requiredElements:
      input?.requiredElements && input.requiredElements.length > 0
        ? input.requiredElements
        : profile.requiredElements,
    forbiddenPhrases: [
      ...FORBIDDEN_PHRASES,
      ...(input?.forbiddenPhrases ?? []).map((p) => p.toLowerCase()),
    ],
    preferredStructure: input?.preferredStructure ?? undefined,
    minWords: input?.minWords ?? undefined,
    maxWords: input?.maxWords ?? undefined,
    allowAnglicisms: input?.allowAnglicisms ?? profile.allowAnglicisms,
    allowFirstPerson: input?.allowFirstPerson ?? profile.allowFirstPerson,
    allowDirectClientMention: input?.allowDirectClientMention ?? true,
    allowGendering: input?.allowGendering ?? true,
  };
}

/**
 * Compact, machine-readable rule summary injected into agent prompts so every
 * agent generates within the same editorial constraints (no finished prompts —
 * just the constraints).
 */
export function rulesPromptSummary(rules: EffectiveRules): string {
  return [
    `Tonalität: ${rules.tone}.`,
    `Keine erfundenen Fakten, Zahlen, Studien, Zitate oder Quellen — nur belegbare Informationen verwenden; Fehlendes als offen markieren.`,
    `Keine KI-Floskeln, keine Gedankenstriche als Stilmittel, keine Dreier-Adjektivketten, keine generischen Fazits.`,
    `Aktiv statt passiv, kurze bis mittlere Sätze, ein Gedanke pro Satz.`,
    rules.allowAnglicisms ? "" : "Anglizismen vermeiden.",
    rules.minWords ? `Mindestens ${rules.minWords} Wörter.` : "",
    rules.maxWords ? `Höchstens ${rules.maxWords} Wörter.` : "",
    rules.requiredElements.length
      ? `Pflicht-Elemente: ${rules.requiredElements.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
