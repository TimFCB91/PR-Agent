// Claim–Reason–Proof principle: every important statement should carry a
// reason and an example/proof. Flags unbacked, vague or purely promotional
// statements.

export interface ClaimReasonProofResult {
  passed: boolean;
  issues: string[];
}

const CLAIM_WORDS = [
  "relevant", "wichtig", "entscheidend", "bedeutend", "interessant",
  "spannend", "notwendig", "zentral", "essenziell",
];
const REASON_WORDS = [
  "weil", "da ", "denn", "dadurch", "dank", "aufgrund", "sodass", "damit",
];
const PROOF_WORDS = [
  "zum beispiel", "beispielsweise", "etwa", "konkret", "z. b.", "z.b.",
  "etwa wenn", "etwa bei",
];
const VAGUE_WORDS = ["viele", "zahlreiche", "einige", "oft", "häufig", "manche"];
const PROMO_WORDS = ["beste", "führend", "einzigartig", "revolutionär", "innovativ"];

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function claimReasonProofCheck(text: string): ClaimReasonProofResult {
  const issues: string[] = [];

  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase();
    const short = sentence.slice(0, 70);

    const isClaim = CLAIM_WORDS.some((w) => lower.includes(w));
    const hasReason = REASON_WORDS.some((w) => lower.includes(w));
    const hasProof = PROOF_WORDS.some((w) => lower.includes(w));

    if (isClaim && !hasReason && !hasProof) {
      issues.push(`Behauptung ohne Begründung/Beispiel: „${short}…"`);
    }
    if (VAGUE_WORDS.some((w) => lower.startsWith(w) || lower.includes(` ${w} `)) && !/\d/.test(lower) && !hasProof) {
      issues.push(`Vage Aussage ohne Konkretisierung: „${short}…"`);
    }
    if (PROMO_WORDS.some((w) => lower.includes(w)) && !hasReason && !hasProof) {
      issues.push(`Werbliche Behauptung ohne Beleg: „${short}…"`);
    }
  }

  return {
    passed: issues.length === 0,
    issues: [...new Set(issues)].slice(0, 12),
  };
}
