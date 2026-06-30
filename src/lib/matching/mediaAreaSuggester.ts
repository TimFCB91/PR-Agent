/**
 * Media-area suggestions for a client.
 *
 * Grounded and deterministic — no invented data:
 *  - The client's *theme terms* are derived only from terms that actually
 *    appear in the client's stored knowledge (weighted by confidence/frequency).
 *  - The *media reach* per theme is the real number of media contacts in the
 *    org's database whose beat/outlet/notes mention that term.
 *
 * So a suggestion only ever says "this client is about X, and you have N media
 * contacts that work in X" — both halves come from real records.
 */

import { terms } from "./topicClientMatcher";

export interface KnowledgeBit {
  text: string;
  confidence?: number | null; // 0-100
}

export interface ThemeTerm {
  term: string;
  weight: number; // raw accumulated weight
}

/** Rank the client's strongest theme terms from its knowledge bits. */
export function clientThemeTerms(bits: KnowledgeBit[]): ThemeTerm[] {
  const score = new Map<string, number>();
  for (const bit of bits) {
    if (!bit.text || !bit.text.trim()) continue;
    const w = Math.min(1, Math.max(0.1, (bit.confidence ?? 50) / 100));
    for (const t of terms(bit.text)) {
      score.set(t, (score.get(t) ?? 0) + w);
    }
  }
  return [...score.entries()]
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term));
}

export interface MediaAreaSuggestion {
  /** The thematic area, display-cased (e.g. "Gesundheit"). */
  area: string;
  /** 0-100, how central this theme is to the client. */
  strength: number;
  /** Number of media contacts in the DB that work in this area. */
  mediaReach: number;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Suggest the media areas that fit a client: its strongest themes, each
 * annotated with how many real media contacts cover that theme.
 *
 * @param bits        the client's knowledge/insights/notes
 * @param mediaTexts  one combined text per media contact (beat+outlet+notes…)
 */
export function suggestMediaAreas(
  bits: KnowledgeBit[],
  mediaTexts: string[],
  limit = 8,
): MediaAreaSuggestion[] {
  const themes = clientThemeTerms(bits);
  if (themes.length === 0) return [];

  const mediaTermSets = mediaTexts.map((t) => new Set(terms(t)));
  const maxWeight = themes[0].weight || 1;

  const suggestions = themes.map((t) => ({
    area: titleCase(t.term),
    strength: Math.round(Math.min(100, (t.weight / maxWeight) * 100)),
    mediaReach: mediaTermSets.filter((s) => s.has(t.term)).length,
  }));

  // Prefer themes that have media reach; among those, the strongest first.
  return suggestions
    .sort(
      (a, b) =>
        Number(b.mediaReach > 0) - Number(a.mediaReach > 0) ||
        b.strength - a.strength ||
        b.mediaReach - a.mediaReach,
    )
    .slice(0, limit);
}
