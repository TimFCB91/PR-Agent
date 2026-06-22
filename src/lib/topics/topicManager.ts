import type { InsightType, Level } from "@prisma/client";

/**
 * Topic manager.
 *
 * Derives story/topic ideas from a client's approved insights and scores them
 * by news value, search potential and priority.
 *
 * MVP: deterministic MOCK. Swap the body of `generateTopicIdeas` for an AI
 * brainstorming call later; the I/O contract can stay the same.
 */

export interface InsightLike {
  insightType: InsightType;
  title: string;
  content?: string | null;
}

export interface ProposedTopic {
  title: string;
  description: string;
  mediaAngle: string;
  targetMediaType: string;
  searchPotential: Level;
  newsValue: Level;
  priority: Level;
}

const ANGLE_BY_TYPE: Partial<Record<InsightType, string>> = {
  EXPERTISE: "Experten-Beitrag / Gastartikel",
  POSITIONING: "Unternehmensprofil / Hintergrundgespräch",
  PROOF_POINT: "Case Study / Zahlen-Story",
  TOPIC_FIELD: "Trend-Story mit Einordnung",
  TARGET_GROUP: "Service-Artikel für die Zielgruppe",
  MEDIA_ANGLE: "Direkter Medien-Pitch",
};

const MEDIA_TYPE_BY_TYPE: Partial<Record<InsightType, string>> = {
  EXPERTISE: "Fachpresse",
  POSITIONING: "Wirtschaftspresse",
  PROOF_POINT: "Branchenmedien",
  TOPIC_FIELD: "Online-Leitmedien",
  TARGET_GROUP: "Zielgruppen-Medien",
  MEDIA_ANGLE: "Tagespresse",
};

function score(insight: InsightLike): {
  searchPotential: Level;
  newsValue: Level;
  priority: Level;
} {
  // Mock scoring rules.
  const high: InsightType[] = ["TOPIC_FIELD", "PROOF_POINT", "MEDIA_ANGLE"];
  const isHigh = high.includes(insight.insightType);
  return {
    searchPotential: isHigh ? "HIGH" : "MEDIUM",
    newsValue: isHigh ? "HIGH" : "MEDIUM",
    priority: isHigh ? "HIGH" : "LOW",
  };
}

export function generateTopicIdeas(insights: InsightLike[]): ProposedTopic[] {
  const usable = insights.filter(
    (i) =>
      i.insightType !== "NO_GO" &&
      i.insightType !== "RISK" &&
      i.insightType !== "MISSING_INFO",
  );

  return usable.map((insight) => {
    const ratings = score(insight);
    return {
      title: `Themenidee: ${insight.title}`,
      description:
        insight.content?.trim() ||
        "Aus einer Erkenntnis abgeleitete Themenidee (Entwurf).",
      mediaAngle: ANGLE_BY_TYPE[insight.insightType] ?? "Allgemeiner Pitch",
      targetMediaType:
        MEDIA_TYPE_BY_TYPE[insight.insightType] ?? "Online-Medien",
      ...ratings,
    };
  });
}

/** Numeric weight for sorting/prioritising topics. */
export function levelWeight(level: Level): number {
  return level === "HIGH" ? 3 : level === "MEDIUM" ? 2 : 1;
}
