/**
 * Media-area suggestions for a client.
 *
 * Grounded and deterministic — no invented data:
 *  - The areas themselves are the client's AI-derived media areas/Ressorts
 *    (stored on the client; extracted from its real documents).
 *  - The *media reach* per area is the real number of media contacts in the
 *    org's database whose beat/outlet/notes mention that area.
 */

import { terms } from "./topicClientMatcher";

export interface MediaAreaSuggestion {
  /** The media area/Ressort (e.g. "Finanzen"). */
  area: string;
  /** Number of media contacts in the DB that work in this area. */
  mediaReach: number;
}

/**
 * Annotate each media area with how many real media contacts cover it. A
 * contact covers an area when it shares a meaningful term (≥4 chars) with it,
 * so single common words don't create spurious matches.
 */
export function suggestMediaAreas(
  areas: string[],
  mediaTexts: string[],
  limit = 12,
): MediaAreaSuggestion[] {
  const mediaTermSets = mediaTexts.map((t) => new Set(terms(t)));

  const seen = new Set<string>();
  const out: MediaAreaSuggestion[] = [];
  for (const raw of areas) {
    const area = raw.trim();
    const key = area.toLowerCase();
    if (!area || seen.has(key)) continue;
    seen.add(key);

    const areaTerms = terms(area).filter((t) => t.length >= 4);
    const mediaReach =
      areaTerms.length === 0
        ? 0
        : mediaTermSets.filter((s) => areaTerms.some((t) => s.has(t))).length;

    out.push({ area, mediaReach });
  }

  return out
    .sort((a, b) => b.mediaReach - a.mediaReach || a.area.localeCompare(b.area))
    .slice(0, limit);
}
