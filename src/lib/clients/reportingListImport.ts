import * as XLSX from "xlsx";

/**
 * Parser for a per-client "Reporting-Liste" (Google-Drive sheet). The
 * "Übersicht" tab lists the placements:
 *   Nr. | Überschrift | Medium | Typ | Print | Deadline | Status | Link | …
 * The highest Nr. is the guaranteed placement count (goal); filled rows become
 * placements (link or "✅" → published, a status without link → accepted).
 */

export type ReportingState = "OPEN" | "ACCEPTED" | "PUBLISHED" | "REJECTED";

export interface ParsedReportingPlacement {
  position: number;
  type?: string;
  medium?: string;
  publicationUrl?: string;
  note?: string;
  state: ReportingState;
}

export interface ParsedReporting {
  goal: number;
  placements: ParsedReportingPlacement[];
}

const COL = { nr: 0, title: 1, medium: 2, type: 3, status: 6, link: 7 } as const;

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

export function parseReportingList(buffer: ArrayBuffer): ParsedReporting {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => /übersicht|ubersicht|overview/i.test(n)) ??
    wb.SheetNames[0];
  if (!sheetName) return { goal: 0, placements: [] };

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
  });

  const rank: Record<ReportingState, number> = {
    PUBLISHED: 3,
    ACCEPTED: 2,
    REJECTED: 1,
    OPEN: 0,
  };

  let goal = 0;
  const byPos = new Map<number, ParsedReportingPlacement>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;

    const nr = parseInt(str(r[COL.nr]).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(nr) || nr <= 0 || nr >= 10000) continue; // numbered only
    goal = Math.max(goal, nr);

    const title = str(r[COL.title]);
    const medium = str(r[COL.medium]);
    const link = (str(r[COL.link]).match(/https?:\/\/\S+/) ?? [])[0];
    const status = str(r[COL.status]);
    if (!medium && !title && !link) continue; // reserved/empty slot

    let type = str(r[COL.type]) || undefined;
    if (type === "I") type = "IZ"; // Interview

    let state: ReportingState;
    if (link) state = "PUBLISHED";
    else if (/✅|veröffentlich|^v\b/i.test(status)) state = "PUBLISHED";
    else if (/absage|abgelehnt|abgesagt|kein interesse/i.test(status))
      state = "REJECTED";
    else if (status) state = "ACCEPTED";
    else state = "OPEN";

    const p: ParsedReportingPlacement = {
      position: nr,
      type,
      medium: medium || undefined,
      publicationUrl: link,
      note: title || undefined,
      state,
    };
    const ex = byPos.get(nr);
    if (!ex || rank[p.state] > rank[ex.state]) byPos.set(nr, p);
  }

  const placements = [...byPos.values()].sort(
    (a, b) => a.position - b.position,
  );
  return { goal, placements };
}
