"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import type { FormState } from "@/lib/form";
import { getOrCreateTopicPool } from "@/lib/topics/topicPool";
import { parseTrelloBoard } from "@/lib/topics/trelloImport";

export interface PoolImportState extends FormState {
  imported?: number;
}

export async function importTrelloTopicsAction(
  _prev: PoolImportState,
  formData: FormData,
): Promise<PoolImportState> {
  let tenant;
  try {
    tenant = await requireWriteAccess();
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: e.message };
    throw e;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Trello-JSON-Datei auswählen." };
  }

  let topics;
  try {
    topics = parseTrelloBoard(await file.text());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.",
    };
  }

  if (topics.length === 0) {
    return { ok: false, error: "Keine offenen Karten im Board gefunden." };
  }

  const pool = await getOrCreateTopicPool(tenant.organizationId);

  await prisma.topicIdea.createMany({
    data: topics.map((t) => ({
      title: t.title,
      description: t.description,
      clientId: pool.id,
      organizationId: tenant.organizationId,
      status: "DRAFT" as const,
    })),
  });

  revalidatePath("/dashboard/themenpool");
  return { ok: true, imported: topics.length };
}

export async function deletePoolTopicAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  await prisma.topicIdea.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  revalidatePath("/dashboard/themenpool");
}
