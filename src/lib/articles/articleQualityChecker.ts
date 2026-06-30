/**
 * Article quality checker.
 *
 * Validates an article draft against a writing rule set: word-count bounds and
 * forbidden phrases. Returns a score and a list of human-readable issues.
 *
 * MVP: deterministic, rule-based checks (no AI needed). A future AI reviewer
 * can extend `checkArticle` with stylistic feedback while keeping the result
 * shape.
 */

export interface QualityRules {
  minWords?: number | null;
  maxWords?: number | null;
  forbiddenPhrases?: string[];
}

export interface QualityResult {
  score: number; // 0-100
  wordCount: number;
  issues: string[];
  passed: boolean;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function checkArticle(
  articleText: string,
  rules?: QualityRules,
): QualityResult {
  const issues: string[] = [];
  const wordCount = countWords(articleText);
  const lower = articleText.toLowerCase();

  if (rules?.minWords && wordCount < rules.minWords) {
    issues.push(
      `Zu kurz: ${wordCount} Wörter (Minimum ${rules.minWords}).`,
    );
  }
  if (rules?.maxWords && wordCount > rules.maxWords) {
    issues.push(
      `Zu lang: ${wordCount} Wörter (Maximum ${rules.maxWords}).`,
    );
  }

  for (const phrase of rules?.forbiddenPhrases ?? []) {
    if (phrase && lower.includes(phrase.toLowerCase())) {
      issues.push(`Verbotene Formulierung gefunden: „${phrase}".`);
    }
  }

  if (wordCount === 0) {
    issues.push("Kein Artikeltext vorhanden.");
  }

  // Simple score: start at 100, subtract per issue.
  const score = Math.max(0, 100 - issues.length * 20);

  return {
    score,
    wordCount,
    issues,
    passed: issues.length === 0,
  };
}
