/**
 * Parse a Trello board JSON export into importable topics.
 *
 * Trello board JSON (Board → Menü → Mehr → JSON exportieren) contains a `lists`
 * array and a `cards` array. Each open card becomes one topic: card name →
 * title, card description + Trello list + labels → description. No external
 * calls, no invented data — purely what the export contains.
 */

export interface ParsedTopic {
  title: string;
  description?: string;
}

interface TrelloList {
  id?: string;
  name?: string;
}

interface TrelloLabel {
  name?: string;
}

interface TrelloCard {
  name?: string;
  desc?: string;
  idList?: string;
  closed?: boolean;
  labels?: TrelloLabel[];
}

interface TrelloBoard {
  lists?: TrelloList[];
  cards?: TrelloCard[];
}

export function parseTrelloBoard(jsonText: string): ParsedTopic[] {
  let data: TrelloBoard;
  try {
    data = JSON.parse(jsonText) as TrelloBoard;
  } catch {
    throw new Error(
      "Die Datei ist kein gültiges JSON. Bitte den Trello-Board-Export (JSON) hochladen.",
    );
  }

  const cards = Array.isArray(data.cards) ? data.cards : [];
  if (!Array.isArray(data.cards)) {
    throw new Error(
      "Kein Trello-Board erkannt (keine Karten gefunden). Bitte den Board-JSON-Export verwenden.",
    );
  }

  const listName = new Map<string, string>();
  for (const l of data.lists ?? []) {
    if (l?.id) listName.set(l.id, (l.name ?? "").trim());
  }

  const out: ParsedTopic[] = [];
  for (const c of cards) {
    if (!c || c.closed) continue;
    const title = (c.name ?? "").trim();
    if (!title) continue;

    const parts: string[] = [];
    if (c.desc && c.desc.trim()) parts.push(c.desc.trim());
    const ln = c.idList ? listName.get(c.idList) : undefined;
    if (ln) parts.push(`Trello-Liste: ${ln}`);
    const labels = Array.isArray(c.labels)
      ? c.labels.map((x) => (x?.name ?? "").trim()).filter(Boolean)
      : [];
    if (labels.length) parts.push(`Labels: ${labels.join(", ")}`);

    out.push({
      title: title.slice(0, 300),
      description: parts.length > 0 ? parts.join("\n") : undefined,
    });
  }

  return out;
}
