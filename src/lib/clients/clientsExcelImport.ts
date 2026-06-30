import * as XLSX from "xlsx";

/**
 * Parser for the agency's "KUNDEN" Excel sheet.
 *
 * The sheet has no single header row; instead it has repeated section/legend
 * rows (col "Onboarding" set) that also name the responsible employee
 * (e.g. "ALEJANDRA"). Columns are positional:
 *   0  Status (xf / Pause / STORNO …)   1  Stufe (A/B/C)     2  Name
 *   3  Notiz                            4  Onboarding (Datum) 5  Closer (Vertrieb)
 *   7  Bezahlt?                         8  Zuständig          9  Produkt/Paket
 *   10 Laufzeit                         11 Berichte soll      12 Versandtag
 */

const COL = {
  status: 0,
  tier: 1,
  name: 2,
  note: 3,
  onboarding: 4,
  responsible: 8,
  package: 9,
  goal: 11,
} as const;

export type ClientStatusValue = "ACTIVE" | "PAUSED" | "ENDED";

export interface ParsedClientRow {
  name: string;
  tier?: "A" | "B" | "C";
  package?: string;
  responsiblePerson?: string;
  onboardingDate?: Date;
  placementGoal?: number;
  status: ClientStatusValue;
  email?: string;
  phone?: string;
  notes?: string;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Read the comment text attached to a cell (SheetJS stores it on cell.c). */
function commentAt(sheet: XLSX.WorkSheet, r: number, c: number): string {
  const cell = sheet[XLSX.utils.encode_cell({ r, c })] as
    | { c?: Array<{ t?: string }> }
    | undefined;
  if (!cell?.c?.length) return "";
  return cell.c
    .map((x) => x.t ?? "")
    .join("\n")
    .trim();
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0].toLowerCase() : undefined;
}

function extractPhone(text: string): string | undefined {
  // Prefer a number right after "Phone"/"Tel".
  const labelled = text.match(/(?:phone|tel)[^\n:]*:?\s*([+\d][\d\s/()-]{6,}\d)/i);
  if (labelled) return labelled[1].trim();
  const any = text.match(/\+\d[\d\s/()-]{6,}\d/);
  return any ? any[0].trim() : undefined;
}

function toGoal(v: unknown): number | undefined {
  if (v instanceof Date) return undefined;
  const m = str(v).match(/\d+/); // first integer (e.g. "10+3" -> 10)
  if (!m) return undefined;
  const n = parseInt(m[0], 10);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return undefined;
  return n;
}

function toDate(v: unknown): Date | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "number" && v > 0) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  // German "DD.MM.YYYY" strings.
  const m = str(v).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function mapStatus(raw: string): ClientStatusValue {
  const s = raw.trim().toUpperCase();
  if (s.includes("STORNO")) return "ENDED";
  if (s.includes("PAUSE")) return "PAUSED";
  return "ACTIVE";
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
}

/** Reduce "Tanja --> Anastasia" / "Matthius&Petra" / "Petra/Elvira" to a clean
 *  primary name, normalising case and dropping junk values. */
function primaryResponsible(raw: string): string | undefined {
  let r = raw.trim();
  if (!r) return undefined;
  if (r.includes("-->")) r = r.split("-->").pop() ?? r;
  r = r.split(/[/+(&]/)[0].replace(/[*]/g, "").trim();
  if (!r) return undefined;
  if (/\d/.test(r)) return undefined; // junk like "PAUSE BIS 1.9.26"
  if (/^(zust|closer|produkt|info|onboarding|name|kunde)/i.test(r)) return undefined;
  return titleCase(r);
}

export function parseClientsExcel(buffer: ArrayBuffer): ParsedClientRow[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => /kunden/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("Keine Tabelle in der Datei gefunden.");

  const sheet = wb.Sheets[sheetName];
  const ref = sheet["!ref"] ?? "A1";
  const range = XLSX.utils.decode_range(ref);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const out: ParsedClientRow[] = [];
  const seen = new Set<string>();
  let section: string | undefined; // current employee section (e.g. ALEJANDRA)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const name = str(row[COL.name]).trim();
    if (!name) continue;
    const excelR = range.s.r + i; // worksheet row for comment lookup

    // Section/legend header row (the "Onboarding" legend is present).
    if (str(row[COL.onboarding]).trim().toLowerCase() === "onboarding") {
      // A single-word, name-like section is an employee; ignore status sections.
      section =
        !name.includes(" ") && !/problem|hold|black|storno|pause/i.test(name)
          ? primaryResponsible(name)
          : undefined;
      continue;
    }

    if (/^(name|kunde|kunden)$/i.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const tierRaw = str(row[COL.tier]).trim().toUpperCase();
    const tier =
      tierRaw === "A" || tierRaw === "B" || tierRaw === "C" ? tierRaw : undefined;

    const responsible =
      primaryResponsible(str(row[COL.responsible])) ?? section;

    // The comment on the NAME cell holds the contact block (address, e-mail,
    // phone, agreement). Other cells in the row hold publication URLs.
    const nameComment = commentAt(sheet, excelR, COL.name);
    const urls: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const t = c === COL.name ? "" : commentAt(sheet, excelR, c);
      const found = t.match(/https?:\/\/\S+/g);
      if (found) urls.push(...found);
    }
    const email = extractEmail(nameComment) || extractEmail(urls.join(" "));
    const phone = extractPhone(nameComment);

    // Keep everything: short note + the full name comment + the placement URLs.
    const noteParts = [
      str(row[COL.note]).trim(),
      nameComment,
      urls.length ? `Veröffentlichungen (laut Excel):\n${urls.join("\n")}` : "",
    ].filter(Boolean);

    out.push({
      name,
      tier,
      package: str(row[COL.package]).trim() || undefined,
      responsiblePerson: responsible,
      onboardingDate: toDate(row[COL.onboarding]),
      placementGoal: toGoal(row[COL.goal]),
      status: mapStatus(str(row[COL.status])),
      email,
      phone,
      notes: noteParts.length ? noteParts.join("\n\n") : undefined,
    });
  }

  return out;
}
