import type { MappedContact } from "@/lib/media/importers/importMapper";

// Validates mapped records and detects duplicates against existing contacts.

export interface ValidationIssue {
  row: number;
  message: string;
}

export interface ValidatedRecord {
  row: number;
  contact: MappedContact;
  valid: boolean;
  errors: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A record needs at least a name OR a medium; email (if present) must be valid. */
export function validateRecord(contact: MappedContact, row: number): ValidatedRecord {
  const errors: string[] = [];
  const hasName = Boolean(contact.firstName || contact.lastName);
  if (!hasName && !contact.outlet) {
    errors.push("Weder Name noch Medium vorhanden.");
  }
  if (contact.email && !EMAIL_RE.test(contact.email)) {
    errors.push(`Ungültige E-Mail: ${contact.email}`);
  }
  return { row, contact, valid: errors.length === 0, errors };
}

export function validateRecords(records: MappedContact[]): ValidatedRecord[] {
  return records.map((c, i) => validateRecord(c, i + 2)); // +2: header + 1-based
}

// --- Duplicate detection -----------------------------------------------------

export interface ExistingContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  outlet: string | null;
  website?: string | null;
}

export type DuplicateReason =
  | "same_email"
  | "same_name_and_medium"
  | "same_website"
  | "same_medium";

export interface DuplicateMatch {
  existingId: string;
  reason: DuplicateReason;
}

const lc = (s?: string | null) => (s ?? "").trim().toLowerCase();

/**
 * Find a duplicate of a candidate among existing contacts. Checks, in order:
 * same email, same name + medium, same website, same medium name.
 */
export function findDuplicate(
  candidate: MappedContact,
  existing: ExistingContact[],
): DuplicateMatch | null {
  const cEmail = lc(candidate.email);
  const cName = `${lc(candidate.firstName)} ${lc(candidate.lastName)}`.trim();
  const cOutlet = lc(candidate.outlet);
  const cWebsite = lc(candidate.website);

  for (const e of existing) {
    if (cEmail && lc(e.email) === cEmail) {
      return { existingId: e.id, reason: "same_email" };
    }
  }
  for (const e of existing) {
    const eName = `${lc(e.firstName)} ${lc(e.lastName)}`.trim();
    if (cName && cOutlet && eName === cName && lc(e.outlet) === cOutlet) {
      return { existingId: e.id, reason: "same_name_and_medium" };
    }
  }
  for (const e of existing) {
    if (cWebsite && lc(e.website) === cWebsite) {
      return { existingId: e.id, reason: "same_website" };
    }
  }
  for (const e of existing) {
    if (cOutlet && !cName && lc(e.outlet) === cOutlet) {
      return { existingId: e.id, reason: "same_medium" };
    }
  }
  return null;
}
