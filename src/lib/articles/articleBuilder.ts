/**
 * Article builder.
 *
 * Produces an article draft from a briefing, optionally constrained by a
 * writing rule set.
 *
 * MVP: template-based MOCK. Replace `buildArticleDraft` with an AI generation
 * call later — the rule set is already passed in so prompts can honour it.
 */

export interface ArticleBuildInputs {
  briefingTitle?: string | null;
  angle?: string | null;
  keyMessages?: string | null;
  suggestedStructure?: string | null;
  clientName: string;
  targetMedium?: string | null;
  targetAudience?: string | null;
}

export interface WritingRules {
  toneOfVoice?: string | null;
  preferredStructure?: string | null;
  minWords?: number | null;
  maxWords?: number | null;
  forbiddenPhrases?: string[];
}

export interface ProposedArticle {
  title: string;
  subtitle: string;
  articleText: string;
  metaDescription: string;
}

export function buildArticleDraft(
  inputs: ArticleBuildInputs,
  rules?: WritingRules,
): ProposedArticle {
  const title = inputs.briefingTitle?.replace(/^Briefing:\s*/i, "") ?? "Neuer Beitrag";
  const tone = rules?.toneOfVoice ? ` (Tonalität: ${rules.toneOfVoice})` : "";

  const structure =
    rules?.preferredStructure ??
    inputs.suggestedStructure ??
    "Einleitung\nHauptteil\nFazit";

  const sections = structure
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
      (heading) =>
        `## ${heading}\n\n[Platzhaltertext für „${heading}" — im MVP als Mock generiert${tone}.]`,
    )
    .join("\n\n");

  const messages = inputs.keyMessages
    ? `\n\n> Kernbotschaften:\n${inputs.keyMessages}`
    : "";

  return {
    title,
    subtitle: inputs.angle ?? `Ein Beitrag von ${inputs.clientName}`,
    articleText: `${sections}${messages}`,
    metaDescription: `${title} – Beitrag von ${inputs.clientName}${
      inputs.targetMedium ? ` für ${inputs.targetMedium}` : ""
    }.`.slice(0, 160),
  };
}
