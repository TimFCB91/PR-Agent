/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes
 * ("") and both \n and \r\n line endings. Returns an array of rows, each row
 * being an array of cell strings. Good enough for contact list uploads without
 * pulling in a dependency.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignore; handled together with \n
    } else {
      field += char;
    }
  }

  // Flush the trailing field/row if the file does not end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully empty rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Quote a single CSV cell if it contains special characters.
function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialises rows (first row = header) into a CSV string. A leading BOM is
 * added so Excel opens UTF-8 correctly.
 */
export function toCsv(rows: Array<Array<unknown>>): string {
  const body = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  return "﻿" + body;
}

/**
 * Parses a CSV with a header row into a list of objects keyed by lowercased
 * header names.
 */
export function parseCsvWithHeader(
  input: string,
): Array<Record<string, string>> {
  const rows = parseCsv(input);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? "").trim();
    });
    return record;
  });
}
