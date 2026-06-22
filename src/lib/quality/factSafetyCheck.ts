// Core rule: agents may only use information that exists in the system. This
// check flags claims in a text that are not backed by the supplied evidence
// corpus (raw inputs, insights, knowledge, briefing, manual notes, …).
//
// MVP: deterministic heuristics. A future AI verifier can replace the body
// while keeping the result shape.

export interface FactSafetyResult {
  passed: boolean;
  unsupportedClaims: string[];
  missingEvidence: string[];
  riskNotes: string[];
}

const SOURCE_WORDS = [
  "studie", "studien", "umfrage", "statistik", "laut einer", "untersuchung",
  "forscher", "erhebung",
];
const RELATION_WORDS = [
  "marktführer", "preisgekrönt", "ausgezeichnet", "zertifiziert",
  "weltweit führend", "branchenführer",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function factSafetyCheck(
  text: string,
  evidence: string,
): FactSafetyResult {
  const haystack = normalize(evidence);
  const unsupportedClaims: string[] = [];
  const missingEvidence: string[] = [];
  const riskNotes: string[] = [];

  // 1. Statistics: percentages, years and large/decimal numbers not grounded
  //    in the evidence are treated as invented.
  const numberMatches = text.match(
    /\b\d+(?:[.,]\d+)?\s?(?:%|prozent)|\b(?:19|20)\d{2}\b|\b\d{1,3}(?:[.,]\d{3})+\b/gi,
  );
  for (const num of numberMatches ?? []) {
    if (!haystack.includes(normalize(num))) {
      unsupportedClaims.push(`Nicht belegte Zahl/Statistik: „${num.trim()}"`);
    }
  }

  // 2. Quotes ("…" or „…") not present in the evidence are invented quotes.
  const quoteMatches = text.match(/[„"]([^“"]{6,})[“"]/g);
  for (const quote of quoteMatches ?? []) {
    const inner = quote.replace(/[„“"]/g, "");
    if (!haystack.includes(normalize(inner))) {
      unsupportedClaims.push(`Nicht belegtes Zitat: ${quote.trim().slice(0, 60)}`);
    }
  }

  // 3. References to studies/sources without matching evidence.
  for (const word of SOURCE_WORDS) {
    if (normalize(text).includes(word) && !haystack.includes(word)) {
      riskNotes.push(`Verweis auf Studie/Quelle ohne hinterlegten Beleg: „${word}".`);
    }
  }

  // 4. Client-reference / media-relationship claims.
  for (const word of RELATION_WORDS) {
    if (normalize(text).includes(word) && !haystack.includes(word)) {
      riskNotes.push(`Behauptung „${word}" ist nicht im System belegt.`);
    }
  }

  if ((numberMatches?.length ?? 0) > 0 && haystack.length < 20) {
    missingEvidence.push("Keine hinterlegten Belege vorhanden, aber Zahlen im Text.");
  }

  return {
    passed: unsupportedClaims.length === 0,
    unsupportedClaims,
    missingEvidence,
    riskNotes,
  };
}
