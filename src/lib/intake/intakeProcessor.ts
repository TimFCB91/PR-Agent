import type { InsightType } from "@prisma/client";

/**
 * Intake processor.
 *
 * Turns a piece of unstructured client information into a set of proposed
 * structured insights.
 *
 * MVP: this is a deterministic, keyword-based MOCK. The function signature is
 * intentionally pure (plain data in, plain data out) so it can later be
 * replaced by an AI call (e.g. an LLM extraction prompt) without touching the
 * callers (actions/UI).
 */

export interface IntakeSource {
  title: string;
  rawText?: string | null;
  sourceType?: string;
}

export interface ProposedInsight {
  insightType: InsightType;
  title: string;
  content: string;
  confidence: number; // 0-100
}

interface Rule {
  keywords: string[];
  insightType: InsightType;
  title: string;
}

// Simple keyword -> insight heuristics standing in for an extraction model.
const RULES: Rule[] = [
  {
    keywords: ["experte", "expertise", "spezialist", "jahre erfahrung", "studie"],
    insightType: "EXPERTISE",
    title: "Mögliche Expertise erkannt",
  },
  {
    keywords: ["zielgruppe", "kunden", "b2b", "b2c", "mittelstand", "entscheider"],
    insightType: "TARGET_GROUP",
    title: "Hinweis auf Zielgruppe",
  },
  {
    keywords: ["marktführer", "positionierung", "einzigartig", "anders als"],
    insightType: "POSITIONING",
    title: "Positionierungs-Ansatz",
  },
  {
    keywords: ["umsatz", "wachstum", "prozent", "auszeichnung", "award", "zertifi"],
    insightType: "PROOF_POINT",
    title: "Möglicher Proof Point",
  },
  {
    keywords: ["zitat", "sagte", "\"", "ceo", "geschäftsführer"],
    insightType: "QUOTE",
    title: "Zitatfähige Aussage",
  },
  {
    keywords: ["trend", "thema", "debatte", "diskussion", "zukunft"],
    insightType: "TOPIC_FIELD",
    title: "Themenfeld identifiziert",
  },
  {
    keywords: ["nicht erwähnen", "vertraulich", "intern", "kein kommentar"],
    insightType: "NO_GO",
    title: "Mögliches No-Go",
  },
  {
    keywords: ["risiko", "kritik", "problem", "rückruf", "klage"],
    insightType: "RISK",
    title: "Potenzielles Risiko",
  },
];

function snippet(text: string, keyword: string): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return "";
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + 80);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + "…";
}

export function processRawInput(source: IntakeSource): ProposedInsight[] {
  const text = `${source.title}\n${source.rawText ?? ""}`;
  const lower = text.toLowerCase();
  const proposals: ProposedInsight[] = [];

  for (const rule of RULES) {
    const hit = rule.keywords.find((k) => lower.includes(k.toLowerCase()));
    if (hit) {
      proposals.push({
        insightType: rule.insightType,
        title: rule.title,
        content: snippet(text, hit) || `Erkannt über Stichwort „${hit}".`,
        // Mock confidence — a real model would return a calibrated score.
        confidence: 55,
      });
    }
  }

  // Always flag missing information so the user knows the intake is a draft.
  if (!source.rawText || source.rawText.trim().length < 40) {
    proposals.push({
      insightType: "MISSING_INFO",
      title: "Wenig Inhalt – mehr Informationen nötig",
      content:
        "Der Rohtext ist sehr kurz. Für belastbare Erkenntnisse mehr Material hinterlegen.",
      confidence: 80,
    });
  }

  return proposals;
}
