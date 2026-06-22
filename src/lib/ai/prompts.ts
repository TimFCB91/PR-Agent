import type { AIMessage } from "@/lib/ai/types";

/**
 * Central prompt registry.
 *
 * IMPORTANT (by design): this file holds the prompt *logic* in ONE place — it
 * does NOT contain finished, hand-tuned production prompts. Each builder
 * assembles a minimal, structural instruction (role + task + a strict output
 * contract) from typed input. Prompt engineering happens here and only here, so
 * agents never embed prompt strings.
 */

// Generic builder: a role/task system message plus a user message carrying the
// serialized input and the required JSON output shape.
function buildJsonPrompt(params: {
  role: string;
  task: string;
  input: unknown;
  outputShape: string;
}): AIMessage[] {
  return [
    {
      role: "system",
      content:
        `${params.role}\n\n` +
        `Aufgabe: ${params.task}\n` +
        // Shared editorial rules every agent must follow (FactSafety + Anti-KI).
        `Schreibregeln: Verwende ausschließlich belegbare Informationen aus den ` +
        `Eingabedaten — erfinde keine Fakten, Zahlen, Studien, Zitate, Quellen ` +
        `oder Kundenreferenzen; markiere Fehlendes als offen. Schreibe ` +
        `redaktionell statt werblich. Vermeide KI-Floskeln, Gedankenstriche als ` +
        `Stilmittel, Dreier-Adjektivketten und generische Fazits. Aktiv statt ` +
        `passiv, ein Gedanke pro Satz.\n` +
        // Knowledge retrieval contract: use the provided sources, cite them,
        // and flag missing information instead of inventing facts.
        `Nutze die bereitgestellten Wissens-Chunks (Feld "sources" der ` +
        `Eingabe) als Faktenbasis. Gib zusätzlich zwei Felder zurück: ` +
        `"sourceReferences" (Array aus {documentId, chunkId, sourceType, ` +
        `shortExcerpt} der tatsächlich genutzten Chunks) und "missingInfo" ` +
        `(Array von Strings für fehlende, aber benötigte Informationen). ` +
        `Reichen die Quellen nicht, fülle "missingInfo" und erfinde nichts.\n` +
        `Antworte ausschließlich mit gültigem JSON in genau dieser Form ` +
        `(plus sourceReferences und missingInfo; keine Erklärungen, kein Markdown):\n` +
        `${params.outputShape}`,
    },
    {
      role: "user",
      content: `Eingabedaten (JSON):\n${JSON.stringify(params.input, null, 2)}`,
    },
  ];
}

export const PROMPTS = {
  topicAgent: (input: unknown): AIMessage[] =>
    buildJsonPrompt({
      role: "Du bist PR-Stratege.",
      task: "Leite aus dem Kundenwissen Themenideen für die Medienarbeit ab.",
      input,
      outputShape:
        '{ "topics": [ { "title": string, "relevance": "LOW"|"MEDIUM"|"HIGH", "targetMediaType": string, "mediaAngle": string, "searchPotential": "LOW"|"MEDIUM"|"HIGH", "priority": "LOW"|"MEDIUM"|"HIGH" } ] }',
    }),

  mediaMatchingAgent: (input: unknown): AIMessage[] =>
    buildJsonPrompt({
      role: "Du bist Medienkontakt-Spezialist.",
      task: "Bewerte, wie gut die Medienkontakte zum Thema und Kundenprofil passen.",
      input,
      outputShape:
        '{ "matches": [ { "mediaContactId": string, "matchScore": number, "reason": string, "suggestedAngle": string } ] }',
    }),

  pitchAgent: (input: unknown): AIMessage[] =>
    buildJsonPrompt({
      role: "Du bist PR-Texter.",
      task: "Erstelle einen Pitch an einen Medienkontakt.",
      input,
      outputShape:
        '{ "subject": string, "pitchEmail": string, "reasoning": string }',
    }),

  followUpAgent: (input: unknown): AIMessage[] =>
    buildJsonPrompt({
      role: "Du bist PR-Texter.",
      task: "Erstelle eine Follow-up-Nachricht passend zur angefragten Variante.",
      input,
      outputShape: '{ "subject": string, "message": string }',
    }),

  briefingAgent: (input: unknown): AIMessage[] =>
    buildJsonPrompt({
      role: "Du bist PR-Redakteur.",
      task: "Erstelle ein Briefing für einen Beitrag.",
      input,
      outputShape:
        '{ "title": string, "targetAudience": string, "keyMessages": string, "structure": string, "expertContext": string, "noGos": string }',
    }),

  articleAgent: (input: unknown): AIMessage[] =>
    buildJsonPrompt({
      role: "Du bist Fachautor.",
      task: "Schreibe einen Artikel anhand von Briefing und Schreibregeln.",
      input,
      outputShape:
        '{ "title": string, "subtitle": string, "article": string, "metaDescription": string }',
    }),
} as const;
