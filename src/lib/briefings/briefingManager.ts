/**
 * Briefing manager.
 *
 * Assembles a structured briefing for an article/pitch from a topic idea and
 * the surrounding client insights.
 *
 * MVP: deterministic MOCK. Replace `buildBriefing` with an AI call later.
 */

export interface BriefingInputs {
  topicTitle?: string | null;
  topicDescription?: string | null;
  mediaAngle?: string | null;
  targetMediaType?: string | null;
  clientName: string;
  keyInsights?: string[];
  noGos?: string[];
}

export interface ProposedBriefing {
  title: string;
  targetAudience: string;
  angle: string;
  keyMessages: string;
  suggestedStructure: string;
  expertContext: string;
  noGos: string;
}

export function buildBriefing(inputs: BriefingInputs): ProposedBriefing {
  const topic = inputs.topicTitle ?? "PR-Thema";
  const messages =
    inputs.keyInsights && inputs.keyInsights.length > 0
      ? inputs.keyInsights.map((m, i) => `${i + 1}. ${m}`).join("\n")
      : "1. Kernbotschaft ergänzen\n2. Beleg/Proof Point ergänzen\n3. Nutzen für die Zielgruppe";

  return {
    title: `Briefing: ${topic}`,
    targetAudience:
      inputs.targetMediaType ?? "Redaktionen der relevanten Fachmedien",
    angle: inputs.mediaAngle ?? inputs.topicDescription ?? "Ansatz noch schärfen",
    keyMessages: messages,
    suggestedStructure: [
      "Einstieg: aktueller Aufhänger",
      "Problem / Kontext",
      "Lösung / Perspektive von " + inputs.clientName,
      "Beleg (Daten, Beispiel, Zitat)",
      "Ausblick / Fazit",
    ].join("\n"),
    expertContext: `${inputs.clientName} als Stimme zum Thema positionieren.`,
    noGos:
      inputs.noGos && inputs.noGos.length > 0
        ? inputs.noGos.join("\n")
        : "Keine vertraulichen Interna nennen.",
  };
}
