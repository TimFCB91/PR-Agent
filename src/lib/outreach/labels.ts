import type { OutreachStatus, OutreachWaitingOn } from "@prisma/client";

/** German labels for the outreach lifecycle. */
export const OUTREACH_STATUS_DE: Record<OutreachStatus, string> = {
  DRAFT: "Entwurf",
  READY: "Bereit zum Senden",
  SENT: "Gesendet",
  FOLLOW_UP_DUE: "Follow-up fällig",
  INTERESTED: "Interesse",
  ACCEPTED: "Zusage",
  DECLINED: "Abgelehnt",
  ARTICLE_DELIVERED: "Artikel geliefert",
  PUBLISHED: "Veröffentlicht",
};

export function statusLabel(s: OutreachStatus): string {
  return OUTREACH_STATUS_DE[s] ?? s;
}

/** German labels for "who is on the ball". */
export const WAITING_ON_DE: Record<OutreachWaitingOn, string> = {
  NONE: "—",
  AGENCY: "Wir",
  CLIENT: "Kunde",
  MEDIA: "Medium",
};

/**
 * Sensible default for "who is on the ball" derived purely from the status,
 * so the overview is useful even without manual upkeep.
 */
export function deriveWaitingOn(status: OutreachStatus): OutreachWaitingOn {
  switch (status) {
    case "DRAFT":
    case "READY":
      return "AGENCY"; // wir müssen senden
    case "SENT":
    case "FOLLOW_UP_DUE":
      return "MEDIA"; // warten auf Medium
    case "INTERESTED":
      return "CLIENT"; // meist Kunde am Zug (Freigabe/Infos)
    case "ACCEPTED":
      return "AGENCY"; // Artikel liefern
    case "ARTICLE_DELIVERED":
      return "MEDIA"; // warten auf Veröffentlichung
    case "DECLINED":
    case "PUBLISHED":
      return "NONE"; // abgeschlossen
    default:
      return "NONE";
  }
}

/**
 * Effective "who is on the ball": the explicit field if set, otherwise derived
 * from the status.
 */
export function effectiveWaitingOn(o: {
  status: OutreachStatus;
  waitingOn?: OutreachWaitingOn | null;
}): OutreachWaitingOn {
  if (o.waitingOn && o.waitingOn !== "NONE") return o.waitingOn;
  return deriveWaitingOn(o.status);
}

export function waitingOnLabel(w: OutreachWaitingOn): string {
  return WAITING_ON_DE[w] ?? w;
}
