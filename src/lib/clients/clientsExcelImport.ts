import * as XLSX from "xlsx";

/**
 * Parser for the agency's existing "KUNDEN" Excel sheet.
 *
 * The sheet has no header row; columns are positional (one row per client):
 *   1  Stufe (A/B/C)        2  Name              4  Onboarding/Start (Datum)
 *   5  Zuständig            9  Paket/Leistung    10 Zeitraum (Text)
 *   11 Zusagenziel (Zahl)   13+ Platzierungs-Status-Spalten (P/L/GZ …)
 *
 * Only the base fields are imported; placement status cells are summarised into
 * a note so historical info isn't lost (the live numbers come from the app).
 */

const COL = {
  tier: 1,
  name: 2,
  onboarding: 4,
  responsible: 5,
  package: 9,
  zeitraum: 10,
  goal: 11,
  statusStart: 13,
} as const;

export interface ParsedClientRow {
  name: string;
  tier?: "A" | "B" | "C";
  package?: string;
  responsiblePerson?: string;
  onboardingDate?: Date;
  placementGoal?: number;
  notes?: string;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function toInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : parseInt(str(v).replace(/[^\d-]/g, ""), 10);
  // Guard against junk cells (e.g. a date that slipped into the goal column):
  // a Zusagenziel above a few thousand is nonsense and would overflow INT4.
  if (!Number.isFinite(n) || n < 0 || n > 100000) return undefined;
  return Math.trunc(n);
}

function toDate(v: unknown): Date | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "number" && v > 0) {
    // Excel serial (1900 date system) → JS Date.
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function parseClientsExcel(buffer: ArrayBuffer): ParsedClientRow[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => /kunden/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("Keine Tabelle in der Datei gefunden.");

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const out: ParsedClientRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const name = str(row[COL.name]).trim();
    if (!name) continue;
    if (/^(name|kunde|kunden)$/i.test(name)) continue; // header-ish
    const key = name.toLowerCase();
    if (seen.has(key)) continue; // de-dupe within the file
    seen.add(key);

    const tierRaw = str(row[COL.tier]).trim().toUpperCase();
    const tier =
      tierRaw === "A" || tierRaw === "B" || tierRaw === "C" ? tierRaw : undefined;

    const zeitraum = str(row[COL.zeitraum]).trim();
    let placements = 0;
    for (let i = COL.statusStart; i < row.length; i++) {
      if (str(row[i]).trim()) placements++;
    }
    const noteParts: string[] = [];
    if (zeitraum && zeitraum !== "-") noteParts.push(`Zeitraum (Excel): ${zeitraum}`);
    if (placements > 0)
      noteParts.push(`Laut Excel ${placements} Platzierungs-Einträge (Codes).`);

    out.push({
      name,
      tier,
      package: str(row[COL.package]).trim() || undefined,
      responsiblePerson: str(row[COL.responsible]).trim() || undefined,
      onboardingDate: toDate(row[COL.onboarding]),
      placementGoal: toInt(row[COL.goal]),
      notes: noteParts.length > 0 ? noteParts.join(" ") : undefined,
    });
  }

  return out;
}
