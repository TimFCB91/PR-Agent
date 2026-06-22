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
