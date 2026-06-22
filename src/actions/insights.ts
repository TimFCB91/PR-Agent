"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { insightSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { generateTopicIdeas } from "@/lib/topics/topicManager";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function createInsightAction(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenant.organizationId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Kunde nicht gefunden." };

  const parsed = insightSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.clientInsight.create({
    data: { ...parsed.data, clientId, organizationId: tenant.organizationId },
  });

  rev(clientId);
  return { ok: true };
}

export async function updateInsightStatusAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));
  const status = String(formData.get("status"));
  if (!["DRAFT", "APPROVED", "REJECTED"].includes(status)) return;

  await prisma.clientInsight.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: status as "DRAFT" | "APPROVED" | "REJECTED" },
  });
  rev(clientId);
}

export async function deleteInsightAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.clientInsight.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}

/**
 * Workflow: generate topic ideas from the client's APPROVED insights using the
 * (mock) topic manager. Persists them as DRAFT TopicIdea rows.
 */
export async function generateTopicsAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenant.organizationId },
    select: { id: true },
  });
  if (!client) return;

  const insights = await prisma.clientInsight.findMany({
    where: {
      clientId,
      organizationId: tenant.organizationId,
      status: "APPROVED",
    },
    select: { insightType: true, title: true, content: true },
  });

  const topics = generateTopicIdeas(insights);
  if (topics.length > 0) {
    await prisma.topicIdea.createMany({
      data: topics.map((t) => ({
        ...t,
        clientId,
        organizationId: tenant.organizationId,
        status: "DRAFT" as const,
      })),
    });
  }

  rev(clientId);
}
