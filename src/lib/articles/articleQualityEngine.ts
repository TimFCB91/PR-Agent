// Article (and general text) quality engine. Orchestrates every check into one
// report and derives the text-quality status + whether the text may be approved.
// Used by all agents so each generated text passes the same review.

import { analyzeText } from "@/lib/writing/textAnalyzer";
import { resolveRules, type RuleSetInput } from "@/lib/writing/rules";
import { rewriteText } from "@/lib/writing/rewriteEngine";
import { factSafetyCheck, type FactSafetyResult } from "@/lib/quality/factSafetyCheck";
import { aiPatternCheck, type AIPatternResult } from "@/lib/quality/aiPatternCheck";
import {
  claimReasonProofCheck,
  type ClaimReasonProofResult,
} from "@/lib/quality/claimReasonProofCheck";
import { editorialChecklist, type EditorialResult } from "@/lib/quality/editorialChecklist";

export type TextQualityStatus =
  | "GENERATED"
  | "CHECKED"
  | "NEEDS_REVIEW"
  | "REVISED"
  | "APPROVED"
  | "REJECTED";

export interface QualityReport {
  score: number;
  status: TextQualityStatus;
  canApprove: boolean;
  factSafety: FactSafetyResult;
  aiPattern: AIPatternResult;
  claimReasonProof: ClaimReasonProofResult;
  editorial: EditorialResult;
  metrics: {
    wordCount: number;
    avgSentenceLength: number;
    longSentences: number;
    fillerWords: string[];
    repeatedWords: string[];
  };
  suggestedRewrite?: string;
}

export interface QualityInput {
  text: string;
  /** All allowed information concatenated (raw inputs, insights, knowledge …). */
  evidence: string;
  ruleSet?: RuleSetInput;
}

export const APPROVAL_MIN_SCORE = 85;

export function runQualityChecks(input: QualityInput): QualityReport {
  const text = input.text ?? "";
  const rules = resolveRules(input.ruleSet);
  const extraForbidden = input.ruleSet?.forbiddenPhrases ?? [];

  const factSafety = factSafetyCheck(text, input.evidence);
  const aiPattern = aiPatternCheck(text, extraForbidden);
  const claimReasonProof = claimReasonProofCheck(text);
  const editorial = editorialChecklist(text, {
    ruleSet: input.ruleSet,
    factPassed: factSafety.passed,
    aiPatternPassed: aiPattern.passed,
    claimProofPassed: claimReasonProof.passed,
  });

  const analysis = analyzeText(text);

  const canApprove =
    factSafety.passed &&
    aiPattern.passed &&
    editorial.score >= APPROVAL_MIN_SCORE &&
    editorial.mustFix.length === 0;

  // Hard fact problems force a manual review; never auto-approvable.
  const status: TextQualityStatus = !factSafety.passed ? "NEEDS_REVIEW" : "CHECKED";

  let suggestedRewrite: string | undefined;
  if (
    aiPattern.rewriteRequired ||
    editorial.score < APPROVAL_MIN_SCORE ||
    !claimReasonProof.passed
  ) {
    const rewrite = rewriteText(text, extraForbidden);
    if (rewrite.changed) suggestedRewrite = rewrite.text;
  }

  return {
    score: editorial.score,
    status,
    canApprove,
    factSafety,
    aiPattern,
    claimReasonProof,
    editorial,
    metrics: {
      wordCount: analysis.wordCount,
      avgSentenceLength: analysis.avgSentenceLength,
      longSentences: analysis.longSentences.length,
      fillerWords: analysis.fillerWords,
      repeatedWords: analysis.repeatedWords.map((r) => r.word),
    },
    suggestedRewrite,
  };
}
