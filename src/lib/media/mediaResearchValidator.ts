import type { ResearchCandidate } from "@/lib/media/mediaResearchProvider";

// Compliance gate for researched candidates. Enforces: no personal data or
// email without a source, mediumName required, confidence clamped. Returns a
// sanitised candidate (never invents data; only strips unsupported claims).

export interface ValidatedCandidate {
  candidate: ResearchCandidate;
  ok: boolean;
  issues: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCandidate(input: ResearchCandidate): ValidatedCandidate {
  const issues: string[] = [];
  const c: ResearchCandidate = { ...input, sourceUrls: input.sourceUrls ?? [] };

  if (!c.mediumName?.trim()) {
    return { candidate: c, ok: false, issues: ["Kein Medienname."] };
  }

  const hasSource = c.sourceUrls.length > 0;

  // No person / email without a verifiable public source.
  if (c.email && (!hasSource || !EMAIL_RE.test(c.email))) {
    issues.push("E-Mail ohne gültige Quelle entfernt (keine geratenen Adressen).");
    c.email = null;
  }
  if ((c.contactName || c.contactRole) && !hasSource) {
    issues.push("Ansprechpartner ohne Quelle entfernt (keine erfundenen Personen).");
    c.contactName = null;
    c.contactRole = null;
  }

  c.confidence = Math.max(0, Math.min(100, Math.round(c.confidence)));
  return { candidate: c, ok: true, issues };
}

export function validateCandidates(candidates: ResearchCandidate[]): ValidatedCandidate[] {
  return candidates.map(validateCandidate).filter((v) => v.ok);
}
