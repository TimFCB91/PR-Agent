import { parseCsvWithHeader } from "@/lib/csv";
import { mapRow, type MappedContact } from "@/lib/media/importers/importMapper";

export interface ParsedImport {
  records: MappedContact[];
  totalRows: number;
}

/** Parse CSV text into mapped contact records. */
export function importCsv(content: string): ParsedImport {
  const rows = parseCsvWithHeader(content);
  return {
    records: rows.map((r) => mapRow(r)),
    totalRows: rows.length,
  };
}
