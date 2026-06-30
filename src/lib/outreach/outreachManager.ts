import type { OutreachStatus } from "@prisma/client";

/**
 * Outreach manager.
 *
 * Generates pitch / follow-up email drafts and encapsulates the outreach
 * lifecycle rules.
 *
 * MVP: template-based MOCK. Replace the draft generators with AI later.
 */

export interface PitchContext {
  contactFirstName?: string | null;
  contactOutlet?: string | null;
  clientName: string;
  topicTitle?: string | null;
  mediaAngle?: string | null;
}

export function generatePitchEmail(ctx: PitchContext): string {
  const greeting = ctx.contactFirstName
    ? `Hallo ${ctx.contactFirstName},`
    : "Sehr geehrte Damen und Herren,";
  const outlet = ctx.contactOutlet ? ` für ${ctx.contactOutlet}` : "";
  const topic = ctx.topicTitle ?? "ein aktuelles Thema";
  const angle = ctx.mediaAngle ? `\n\nAngedachter Ansatz: ${ctx.mediaAngle}.` : "";

  return `${greeting}

ich melde mich im Namen von ${ctx.clientName} mit einem Themenvorschlag${outlet}: „${topic}".${angle}

Gerne stelle ich Ihnen weitere Hintergründe, Daten und O-Töne zur Verfügung. Hätten Sie Interesse an einem kurzen Austausch?

Beste Grüße`;
}

export function generateFollowUpEmail(ctx: PitchContext): string {
  const greeting = ctx.contactFirstName
    ? `Hallo ${ctx.contactFirstName},`
    : "Sehr geehrte Damen und Herren,";
  const topic = ctx.topicTitle ?? "meinen Themenvorschlag";

  return `${greeting}

ich wollte kurz nachfassen zu „${topic}" für ${ctx.clientName}. Passt das Thema in Ihre aktuelle Planung? Ich liefere Ihnen gerne alles Nötige zu.

Beste Grüße`;
}

/**
 * Default number of days after the first mail when a follow-up becomes due.
 * Mirrors the agency plan ("nach fünf, sieben oder zehn Tagen").
 */
export const FOLLOW_UP_AFTER_DAYS = 7;

/** Compute the follow-up date from the send date (sentAt + N days). */
export function computeFollowUpDate(
  sentAt: Date,
  days: number = FOLLOW_UP_AFTER_DAYS,
): Date {
  const d = new Date(sentAt);
  d.setDate(d.getDate() + days);
  return d;
}

/** Statuses where a contact is still awaiting an answer (follow-up territory). */
const OPEN_STATUSES: OutreachStatus[] = ["SENT", "FOLLOW_UP_DUE"];

/**
 * Response types that CLOSE an outreach (no further follow-up). NO_RESPONSE and
 * OUT_OF_OFFICE explicitly keep it open — we still want to nudge those.
 */
const CLOSING_RESPONSES = [
  "INTERESTED",
  "ACCEPTED",
  "DECLINED",
  "NEEDS_MORE_INFO",
  "WRONG_CONTACT",
];

/** Statuses that count as an open follow-up obligation. */
export function isFollowUpDue(
  status: OutreachStatus,
  nextFollowUpDate?: Date | null,
): boolean {
  if (status === "FOLLOW_UP_DUE") return true;
  if (status === "SENT" && nextFollowUpDate) {
    return nextFollowUpDate.getTime() <= Date.now();
  }
  return false;
}

/**
 * Decides whether an outreach belongs on the daily follow-up worklist.
 * A contact appears when: a first mail went out, no response is recorded yet,
 * the follow-up date is reached, the contact is not closed and not protected
 * (doNotContact / BLACKLIST). Mirrors the agency plan's follow-up rules.
 */
export function shouldFollowUp(o: {
  status: OutreachStatus;
  sentAt?: Date | null;
  nextFollowUpDate?: Date | null;
  responseReceivedAt?: Date | null;
  responseType?: string | null;
  contactDoNotContact?: boolean | null;
  contactRelationship?: string | null;
}): boolean {
  if (o.contactDoNotContact) return false;
  if (o.contactRelationship === "BLACKLIST") return false;
  if (o.responseReceivedAt) return false;
  if (o.responseType && CLOSING_RESPONSES.includes(o.responseType)) return false;
  if (!OPEN_STATUSES.includes(o.status)) return false;
  if (!o.sentAt) return false;
  return isFollowUpDue(o.status, o.nextFollowUpDate);
}

/** Statuses that represent a positive outcome. */
export const ACCEPTED_STATUSES: OutreachStatus[] = [
  "INTERESTED",
  "ACCEPTED",
  "ARTICLE_DELIVERED",
  "PUBLISHED",
];

export const DECLINED_STATUSES: OutreachStatus[] = ["DECLINED"];

/** Statuses where the contact has already been reached. */
export const CONTACTED_STATUSES: OutreachStatus[] = [
  "SENT",
  "FOLLOW_UP_DUE",
  "INTERESTED",
  "ACCEPTED",
  "DECLINED",
  "ARTICLE_DELIVERED",
  "PUBLISHED",
];
