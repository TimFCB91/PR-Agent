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
