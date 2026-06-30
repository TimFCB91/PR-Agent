import { prisma } from "@/lib/prisma";

import { buildClientProfile, type ClientProfile } from "./topicClientMatcher";

/**
 * Load weighted matching profiles for all real clients of an organization
 * (excluding the internal topic pool). Profiles are built from each client's
 * knowledge, approved insights and notes.
 */
export async function loadClientProfiles(
  organizationId: string,
): Promise<ClientProfile[]> {
  const [clients, knowledge, insights] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId, isTopicPool: false },
      select: { id: true, name: true, notes: true },
    }),
    prisma.clientKnowledge.findMany({
      where: { organizationId },
      select: { clientId: true, title: true, content: true, confidence: true },
    }),
    prisma.clientInsight.findMany({
      where: { organizationId, status: "APPROVED" },
      select: { clientId: true, title: true, content: true, confidence: true },
    }),
  ]);

  const bits = new Map<
    string,
    Array<{ text: string; confidence?: number | null }>
  >();
  const push = (cid: string, text: string | null, conf?: number | null) => {
    if (!text) return;
    const arr = bits.get(cid) ?? [];
    arr.push({ text, confidence: conf });
    bits.set(cid, arr);
  };
  for (const k of knowledge)
    push(k.clientId, `${k.title} ${k.content ?? ""}`, k.confidence);
  for (const i of insights)
    push(i.clientId, `${i.title} ${i.content ?? ""}`, i.confidence);
  for (const c of clients) push(c.id, c.notes, 40);

  return clients.map((c) =>
    buildClientProfile({ id: c.id, name: c.name, bits: bits.get(c.id) ?? [] }),
  );
}
