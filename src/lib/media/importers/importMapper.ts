// Maps arbitrary import columns (CSV / Excel / Zimpel) onto the canonical
// MediaContact fields. Unrecognised columns are preserved as metadata so no
// information is lost. Header matching is case-/whitespace-insensitive.

export interface MappedContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  outlet?: string; // Medium
  beat?: string; // Ressort / Section
  website?: string;
  region?: string;
  country?: string;
  topics?: string;
  mediaType?: string;
  notes?: string;
  metadata: Record<string, string>;
}

type CanonicalField =
  | "firstName" | "lastName" | "name" | "email" | "phone" | "outlet"
  | "beat" | "website" | "region" | "country" | "topics" | "mediaType" | "notes";

// Synonyms (German + English + typical Zimpel labels), all lowercased.
const SYNONYMS: Record<CanonicalField, string[]> = {
  firstName: ["firstname", "first name", "vorname"],
  lastName: ["lastname", "last name", "nachname", "name nachname"],
  name: ["name", "vollständiger name", "kontakt", "ansprechpartner", "kontaktname"],
  email: ["email", "e-mail", "e mail", "mail", "e-mail-adresse", "emailadresse"],
  phone: ["phone", "telefon", "tel", "telefonnummer", "tel.", "durchwahl"],
  outlet: ["medium", "outlet", "publikation", "titel", "zeitung", "magazin", "sender", "medienname", "objekt"],
  beat: ["ressort", "rubrik", "section", "beat", "themengebiet", "redaktion"],
  website: ["website", "web", "url", "homepage", "internet", "webseite"],
  region: ["region", "bundesland", "stadt", "ort", "plz", "plz/ort"],
  country: ["land", "country", "staat"],
  topics: ["themen", "themeninteressen", "interessen", "topics", "schwerpunkte"],
  mediaType: ["medientyp", "media type", "typ", "gattung", "mediengattung"],
  notes: ["notizen", "notes", "bemerkung", "kommentar", "anmerkung"],
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Detect which canonical field each header maps to (null = unmapped). */
export function detectMapping(headers: string[]): Record<string, CanonicalField | null> {
  const mapping: Record<string, CanonicalField | null> = {};
  for (const header of headers) {
    const n = norm(header);
    let match: CanonicalField | null = null;
    for (const [field, syns] of Object.entries(SYNONYMS) as [CanonicalField, string[]][]) {
      if (syns.includes(n)) {
        match = field;
        break;
      }
    }
    mapping[header] = match;
  }
  return mapping;
}

function splitName(name: string): { firstName?: string; lastName?: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

/**
 * Map one record (object keyed by original headers) to a MappedContact.
 * Unrecognised, non-empty columns are stored under `metadata`.
 */
export function mapRow(record: Record<string, string>): MappedContact {
  const mapping = detectMapping(Object.keys(record));
  const out: MappedContact = { metadata: {} };
  let fullName: string | undefined;

  for (const [header, rawValue] of Object.entries(record)) {
    const value = (rawValue ?? "").toString().trim();
    if (!value) continue;
    const field = mapping[header];
    if (!field) {
      out.metadata[header] = value;
      continue;
    }
    if (field === "name") {
      fullName = value;
    } else {
      out[field] = value;
    }
  }

  // Derive first/last from a combined name column if needed.
  if (fullName && (!out.firstName || !out.lastName)) {
    const split = splitName(fullName);
    out.firstName = out.firstName ?? split.firstName;
    out.lastName = out.lastName ?? split.lastName;
  }
  if (out.email) out.email = out.email.toLowerCase();
  return out;
}
