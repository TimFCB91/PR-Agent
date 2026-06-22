/**
 * Topic ↔ Client matching.
 *
 * Given a topic idea and the org's clients (with their knowledge/insights),
 * rank which clients fit the topic best — for positioning a client as expert
 * on a topic or reusing a strong topic across several clients.
 *
 * Pure, deterministic, keyword-based. No invented data: a match is only ever
 * derived from terms that actually appear in the client's stored knowledge.
 */

const STOPWORDS = new Set([
  "und", "oder", "der", "die", "das", "ein", "eine", "einen", "einer", "mit",
  "für", "von", "den", "dem", "des", "ist", "sind", "wie", "was", "wer", "auf",
  "aus", "bei", "zum", "zur", "über", "unter", "vor", "nach", "durch", "gegen",
  "the", "and", "for", "with", "von", "im", "in", "am", "an", "als", "auch",
  "sich", "nicht", "mehr", "sehr", "kann", "können", "soll", "sollen", "wird",
  "werden", "haben", "hat", "sein", "ihre", "ihrer", "ihren", "themenidee",
  "thema", "themen", "beitrag", "artikel", "story", "pitch",
]);

/** Tokenise into a unique set of meaningful, lowercased terms. */
export function terms(text: string): string[] {
  return [
    ...new Set(
      (text.toLowerCase().match(/\p{L}+/gu) ?? []).filter(
        (w) => w.length > 2 && !STOPWORDS.has(w),
      ),
    ),
  ];
}

export interface ClientKnowledgeBit {
  text: string;
  confidence?: number | null; // 0-100
}

export interface ClientProfileInput {
  id: string;
  name: string;
  bits: ClientKnowledgeBit[]; // knowledge items, insights, notes…
}

export interface ClientProfile {
  id: string;
  name: string;
  /** term -> weight (0..1), the strongest confidence the term appeared with. */
  termWeights: Map<string, number>;
  hasKnowledge: boolean;
}

/** Build a weighted term profile for a client from its knowledge bits. */
export function buildClientProfile(input: ClientProfileInput): ClientProfile {
  const termWeights = new Map<string, number>();
  let hasKnowledge = false;

  for (const bit of input.bits) {
    if (!bit.text || !bit.text.trim()) continue;
    hasKnowledge = true;
    const weight = Math.min(1, Math.max(0.1, (bit.confidence ?? 50) / 100));
    for (const t of terms(bit.text)) {
      termWeights.set(t, Math.max(termWeights.get(t) ?? 0, weight));
    }
  }

  // The client name itself is a weak signal.
  for (const t of terms(input.name)) {
    termWeights.set(t, Math.max(termWeights.get(t) ?? 0, 0.3));
  }

  return { id: input.id, name: input.name, termWeights, hasKnowledge };
}

export interface TopicMatch {
  clientId: string;
  clientName: string;
  score: number; // 0-100
  matchedTerms: string[];
  note?: string;
}

/**
 * Rank clients against a topic text. Score = share of the topic's terms that
 * appear in the client's profile, weighted by the client's confidence in them.
 */
export function matchClientsToTopic(
  topicText: string,
  profiles: ClientProfile[],
  limit = 5,
): TopicMatch[] {
  const topicTerms = terms(topicText);

  const matches: TopicMatch[] = profiles.map((p) => {
    const matchedTerms: string[] = [];
    let weightSum = 0;
    for (const t of topicTerms) {
      const w = p.termWeights.get(t);
      if (w) {
        matchedTerms.push(t);
        weightSum += w;
      }
    }
    const score =
      topicTerms.length === 0
        ? 0
        : Math.round(Math.min(100, (weightSum / topicTerms.length) * 100));

    let note: string | undefined;
    if (!p.hasKnowledge) {
      note = "Kein Wissen hinterlegt – Matching unsicher.";
    } else if (matchedTerms.length === 0) {
      note = "Keine thematische Überschneidung gefunden.";
    }

    return {
      clientId: p.id,
      clientName: p.name,
      score,
      matchedTerms: matchedTerms.slice(0, 8),
      note,
    };
  });

  return matches
    .sort((a, b) => b.score - a.score || a.clientName.localeCompare(b.clientName))
    .slice(0, limit);
}
