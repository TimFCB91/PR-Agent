// Provider abstraction for media research. MOCK by default (no network): it
// proposes media *archetypes* to look into — never inventing persons, emails or
// unsourced facts. A live provider (LLM + web search over PUBLIC sources only)
// can be plugged in later behind the same interface.

export interface ResearchQuery {
  clientName: string;
  industry?: string | null;
  targetGroup?: string | null;
  topic?: string | null;
  region?: string | null;
  mediaType?: string | null;
}

export interface ResearchCandidate {
  mediumName: string;
  website?: string | null;
  mediaType?: string | null;
  section?: string | null;
  region?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  email?: string | null;
  contactPageUrl?: string | null;
  sourceUrls: string[];
  relevanceReason?: string | null;
  suggestedAngle?: string | null;
  confidence: number; // 0-100
}

export interface MediaResearchProvider {
  readonly name: "mock" | "live";
  research(query: ResearchQuery): Promise<ResearchCandidate[]>;
}

// Media archetypes used by the mock — describe WHERE to look, with no fabricated
// people or contact data.
const ARCHETYPES: Array<{ type: string; suffix: string }> = [
  { type: "Fachpresse", suffix: "Fachmagazin" },
  { type: "Online-Leitmedium", suffix: "Online-Redaktion" },
  { type: "Regionalmedium", suffix: "Regionalzeitung" },
  { type: "Verbrauchermedium", suffix: "Verbrauchermagazin" },
  { type: "Podcast", suffix: "Fachpodcast" },
];

class MockResearchProvider implements MediaResearchProvider {
  readonly name = "mock" as const;
  async research(query: ResearchQuery): Promise<ResearchCandidate[]> {
    const topic = query.topic ?? query.industry ?? "das Thema";
    const pool = query.mediaType
      ? ARCHETYPES.filter((a) => a.type.toLowerCase().includes(query.mediaType!.toLowerCase()))
      : ARCHETYPES;
    const chosen = (pool.length ? pool : ARCHETYPES).slice(0, 4);

    return chosen.map((a, i) => ({
      mediumName: `${a.suffix} zu „${topic}" (recherchieren)`,
      website: null,
      mediaType: a.type,
      section: query.topic ?? null,
      region: query.region ?? null,
      // No invented persons / emails.
      contactName: null,
      contactRole: null,
      email: null,
      contactPageUrl: null,
      // Mock has no verified sources — the user must verify before import.
      sourceUrls: [],
      relevanceReason: `Passt thematisch zu „${topic}"${
        query.targetGroup ? ` und zur Zielgruppe ${query.targetGroup}` : ""
      }. Vorschlag zur manuellen Prüfung.`,
      suggestedAngle: query.topic ? `Einordnung von ${topic}` : "Themenvorschlag",
      confidence: 45 - i * 5,
    }));
  }
}

/**
 * Returns the configured research provider. Default: mock. A live provider is
 * only used when MEDIA_RESEARCH_MODE=live is set (and must restrict itself to
 * publicly accessible sources — no logins, no paywalls).
 */
export function getMediaResearchProvider(): MediaResearchProvider {
  // Live research is intentionally not enabled here; the mock keeps the whole
  // flow working and compliant. Wire a real LLM+web-search provider in when
  // ready, returning the same ResearchCandidate shape with real sourceUrls.
  return new MockResearchProvider();
}
