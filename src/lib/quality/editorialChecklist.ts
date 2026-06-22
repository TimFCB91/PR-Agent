// Editorial checklist scorer. Runs the A/B/C/D criteria and aggregates them
// into a 0-100 score, with issues, recommendations and hard must-fix items.

import { analyzeText } from "@/lib/writing/textAnalyzer";
import { resolveRules, type RuleSetInput } from "@/lib/writing/rules";
import { runChecklist, type CriterionResult } from "@/lib/writing/qualityChecklist";

export interface EditorialResult {
  score: number; // 0-100
  passed: boolean;
  issues: string[];
  recommendations: string[];
  mustFix: string[];
  criteria: CriterionResult[];
}

export function editorialChecklist(
  text: string,
  opts: {
    ruleSet?: RuleSetInput;
    factPassed: boolean;
    aiPatternPassed: boolean;
    claimProofPassed: boolean;
  },
): EditorialResult {
  const analysis = analyzeText(text);
  const rules = resolveRules(opts.ruleSet);

  const criteria = runChecklist({
    analysis,
    rules,
    factPassed: opts.factPassed,
    aiPatternPassed: opts.aiPatternPassed,
    claimProofPassed: opts.claimProofPassed,
  });

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
  const passedWeight = criteria
    .filter((c) => c.ok)
    .reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((passedWeight / totalWeight) * 100);

  const failed = criteria.filter((c) => !c.ok);
  const mustFix = failed.filter((c) => c.mustFix).map((c) => c.message ?? c.label);
  const issues = failed
    .filter((c) => !c.mustFix && (c.category === "A" || c.category === "C"))
    .map((c) => c.message ?? c.label);
  const recommendations = failed
    .filter((c) => !c.mustFix && (c.category === "B" || c.category === "D"))
    .map((c) => c.message ?? c.label);

  return {
    score,
    passed: score >= 85 && mustFix.length === 0,
    issues,
    recommendations,
    mustFix,
    criteria,
  };
}
