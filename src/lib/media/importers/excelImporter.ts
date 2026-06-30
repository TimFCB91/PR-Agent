import * as XLSX from "xlsx";

import { mapRow, type MappedContact } from "@/lib/media/importers/importMapper";
import type { ParsedImport } from "@/lib/media/importers/csvImporter";

/**
 * Parse an Excel (.xlsx/.xls) buffer into mapped contact records. Reads the
 * first sheet; rows become objects keyed by the header row.
 */
export function importExcel(buffer: ArrayBuffer): ParsedImport {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return { records: [], totalRows: 0 };

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const records = rows.map((row) => {
    const stringRecord: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      stringRecord[k] = v == null ? "" : String(v);
    }
    return mapRow(stringRecord);
  });

  return { records, totalRows: rows.length };
}
