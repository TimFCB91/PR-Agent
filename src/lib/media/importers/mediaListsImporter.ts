import * as XLSX from "xlsx";

/**
 * Parser for the agency's own media lists in the KUNDEN workbook:
 *   - "Medienfreunde A - M" / "N - Z": Kategorie | Medium/URL | Kosten | Notiz
 *   - "Podcaster": Name | Kontaktdaten | Links | Notiz
 *   - "Radiosender": Station | Kontakt (Mail) | Moderator
 * Each row becomes a media contact. E-mail/phone are extracted from the free
 * text; nothing is lost (cost, links, notes go into notes).
 */

export interface ParsedMediaContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  outlet?: string;
  beat?: string;
  notes?: string;
  kind: "MEDIUM" | "PODCAST" | "RADIO";
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}
function extractEmail(t: string): string | undefined {
  const m = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0].toLowerCase() : undefined;
}
function extractPhone(t: string): string | undefined {
  const m = t.match(/(?:\+\d|00\d|0\d)[\d\s/().-]{6,}\d/);
  return m ? m[0].replace(/\s+/g, " ").trim() : undefined;
}
function looksUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}
function domainOf(u: string): string | undefined {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function parseMediaLists(buffer: ArrayBuffer): ParsedMediaContact[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const out: ParsedMediaContact[] = [];
  const seen = new Set<string>();

  const push = (c: ParsedMediaContact) => {
    const key = (
      c.email || `${c.firstName}|${c.outlet ?? ""}|${c.kind}`
    ).toLowerCase();
    if (!key.trim() || seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  for (const sheetName of wb.SheetNames) {
    const isMF = /medienfreunde/i.test(sheetName);
    const isPod = /podcast/i.test(sheetName);
    const isRadio = /radio/i.test(sheetName);
    if (!isMF && !isPod && !isRadio) continue;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: "",
      raw: false,
    });

    let category = "";
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const c0 = str(row[0]);
      const c1 = str(row[1]);
      const c2 = str(row[2]);
      const c3 = str(row[3]);

      if (isMF) {
        if (c0 && !c1) {
          category = c0; // section header (e.g. "Printmedien")
          continue;
        }
        if (!c1 && !c3) continue;
        const display = looksUrl(c1) ? (domainOf(c1) ?? c1) : c1.slice(0, 80);
        if (!display) continue;
        push({
          firstName: display,
          lastName: "",
          email: extractEmail(`${c1} ${c2} ${c3}`),
          phone: extractPhone(`${c1} ${c3}`),
          outlet: display,
          beat: category || "Medium",
          notes:
            [looksUrl(c1) ? c1 : "", c2 ? `Kosten: ${c2}` : "", c3]
              .filter(Boolean)
              .join("\n") || undefined,
          kind: "MEDIUM",
        });
      } else if (isPod) {
        if (!c0) continue;
        push({
          firstName: c0,
          lastName: "",
          email: extractEmail(`${c1} ${c2}`),
          phone: extractPhone(c1),
          outlet: c0,
          beat: "Podcast",
          notes: [c1, c2, c3].filter(Boolean).join("\n") || undefined,
          kind: "PODCAST",
        });
      } else if (isRadio) {
        if (!c0) continue;
        push({
          firstName: c2 || c0,
          lastName: "",
          email: extractEmail(c1),
          phone: extractPhone(c1),
          outlet: c0,
          beat: "Radio",
          notes:
            [c1, c2 ? `Moderator: ${c2}` : ""].filter(Boolean).join("\n") ||
            undefined,
          kind: "RADIO",
        });
      }
    }
  }

  return out;
}
