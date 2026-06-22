import type { OutreachStatus, ResponseType } from "@prisma/client";

// Pure media-performance maths. Learns from real outreach + publication history:
// reply / acceptance / publication rates, response time, successful topics &
// angles, and frequent rejection reasons. No DB access — fully testable.

export interface OutreachRecord {
  status: OutreachStatus;
  sentAt: Date | null;
  responseType: ResponseType | null;
  responseReceivedAt: Date | null;
  rejectionReason: string | null;
  acceptedAngle: string | null;
  agreedTopic: string | null;
}

export interface PublicationRecord {
  resultingTopic: string | null;
  resultingAngle: string | null;
}

export interface ContactMetrics {
  sentCount: number;
  replyRate: number | null; // 0-100
  acceptanceRate: number | null;
  publicationRate: number | null;
  averageResponseTime: number | null; // hours
  successfulTopics: Array<{ topic: string; count: number }>;
  preferredAngles: string[];
  avoidedTopics: string[];
  rejectionReasons: Array<{ reason: string; count: number }>;
  lastSuccessfulTopic: string | null;
}

const NOT_YET_SENT: OutreachStatus[] = ["DRAFT", "READY"];
const ACCEPTED_STATUS: OutreachStatus[] = [
  "ACCEPTED",
  "ARTICLE_DELIVERED",
  "PUBLISHED",
];

function isSent(o: OutreachRecord): boolean {
  return o.sentAt != null || !NOT_YET_SENT.includes(o.status);
}

function isAccepted(o: OutreachRecord): boolean {
  return o.responseType === "ACCEPTED" || ACCEPTED_STATUS.includes(o.status);
}

function tally(values: Array<string | null | undefined>): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const v of values) {
    const t = v?.trim();
    if (t) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

const pct = (num: number, denom: number): number | null =>
  denom > 0 ? Math.round((num / denom) * 1000) / 10 : null;

export function computeContactMetrics(
  outreaches: OutreachRecord[],
  publications: PublicationRecord[],
): ContactMetrics {
  const sent = outreaches.filter(isSent);
  const sentCount = sent.length;

  const replies = sent.filter(
    (o) => o.responseType != null && o.responseType !== "NO_RESPONSE",
  );
  const accepted = sent.filter(isAccepted);
  const declined = sent.filter((o) => o.responseType === "DECLINED");

  // Average response time (hours) over outreaches with both timestamps.
  const responseTimes = sent
    .filter((o) => o.sentAt && o.responseReceivedAt)
    .map((o) => (o.responseReceivedAt!.getTime() - o.sentAt!.getTime()) / 3_600_000)
    .filter((h) => h >= 0);
  const averageResponseTime = responseTimes.length
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
    : null;

  const successfulTopics = tally([
    ...accepted.map((o) => o.agreedTopic),
    ...publications.map((p) => p.resultingTopic),
  ]).map((t) => ({ topic: t.key, count: t.count }));

  const preferredAngles = tally([
    ...accepted.map((o) => o.acceptedAngle),
    ...publications.map((p) => p.resultingAngle),
  ])
    .map((a) => a.key)
    .slice(0, 5);

  const avoidedTopics = tally(declined.map((o) => o.agreedTopic))
    .map((t) => t.key)
    .slice(0, 5);

  const rejectionReasons = tally(declined.map((o) => o.rejectionReason)).map((r) => ({
    reason: r.key,
    count: r.count,
  }));

  // Most recent successful topic.
  const lastSuccessful = [...accepted]
    .filter((o) => o.agreedTopic)
    .sort(
      (a, b) =>
        (b.responseReceivedAt ?? b.sentAt ?? new Date(0)).getTime() -
        (a.responseReceivedAt ?? a.sentAt ?? new Date(0)).getTime(),
    )[0];

  return {
    sentCount,
    replyRate: pct(replies.length, sentCount),
    acceptanceRate: pct(accepted.length, sentCount),
    publicationRate: pct(publications.length, sentCount),
    averageResponseTime,
    successfulTopics: successfulTopics.slice(0, 5),
    preferredAngles,
    avoidedTopics,
    rejectionReasons,
    lastSuccessfulTopic: lastSuccessful?.agreedTopic ?? null,
  };
}

export interface SuccessRate {
  key: string;
  attempts: number;
  successes: number;
  rate: number; // 0-100
}

// Success rate per topic / per angle: an attempt is a sent outreach carrying
// that topic/angle; a success is an acceptance or publication.
export function computeTopicAngleRates(outreaches: OutreachRecord[]): {
  topics: SuccessRate[];
  angles: SuccessRate[];
} {
  const sent = outreaches.filter(isSent);

  const rate = (
    keyOf: (o: OutreachRecord) => string | null | undefined,
  ): SuccessRate[] => {
    const attempts = new Map<string, number>();
    const successes = new Map<string, number>();
    for (const o of sent) {
      const key = keyOf(o)?.trim();
      if (!key) continue;
      attempts.set(key, (attempts.get(key) ?? 0) + 1);
      if (isAccepted(o)) successes.set(key, (successes.get(key) ?? 0) + 1);
    }
    return [...attempts.entries()]
      .map(([key, a]) => {
        const s = successes.get(key) ?? 0;
        return { key, attempts: a, successes: s, rate: Math.round((s / a) * 1000) / 10 };
      })
      .sort((x, y) => y.rate - x.rate || y.attempts - x.attempts);
  };

  return {
    topics: rate((o) => o.agreedTopic),
    angles: rate((o) => o.acceptedAngle),
  };
}

/** Word-overlap similarity (0-1) used to spot "already worked on a similar topic". */
export function topicSimilarity(a: string, b: string): number {
  const wordsOf = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .match(/\p{L}+/gu)
        ?.filter((w) => w.length > 4) ?? [],
    );
  const wa = wordsOf(a);
  const wb = wordsOf(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.min(wa.size, wb.size);
}
