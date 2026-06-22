import { importCsv, type ParsedImport } from "@/lib/media/importers/csvImporter";
import { importExcel } from "@/lib/media/importers/excelImporter";

// Zimpel distributor exports are ordinary CSV/Excel files with typical German
// media columns (Medium, Ressort, Redaktion, Vorname, Nachname, E-Mail, …).
// The shared importMapper already recognises these labels, so the Zimpel
// importer is a thin wrapper that picks the right parser and is the place to add
// Zimpel-specific quirks later. No Zimpel API is assumed.

// Header signatures that indicate a Zimpel export.
const ZIMPEL_SIGNATURE = ["medium", "ressort", "redaktion", "objekt"];

export function looksLikeZimpel(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const hits = ZIMPEL_SIGNATURE.filter((s) => lower.includes(s)).length;
  return hits >= 2;
}

export function importZimpelCsv(content: string): ParsedImport {
  return importCsv(content);
}

export function importZimpelExcel(buffer: ArrayBuffer): ParsedImport {
  return importExcel(buffer);
}
