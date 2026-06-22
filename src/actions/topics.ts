"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { topicSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { buildBriefing } from "@/lib/briefings/briefingManager";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

// Confirms an optional campaign id (if given) belongs to the org.
async function validCampaign(
  campaignId: string | undefined,
  organizationId: string,
): Promise<boolean> {
  if (!campaignId) return true;
  const c = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true },
  });
  return Boolean(c);
}

export async function createTopicAction(
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

  const parsed = topicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await validCampaign(parsed.data.campaignId, tenant.organizationId))) {
    return { ok: false, error: "Ungültige Kampagne." };
  }

  await prisma.topicIdea.create({
    data: { ...parsed.data, clientId, organizationId: tenant.organizationId },
  });

  rev(clientId);
  return { ok: true };
}

export async function updateTopicAction(
  clientId: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = topicSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await validCampaign(parsed.data.campaignId, tenant.organizationId))) {
    return { ok: false, error: "Ungültige Kampagne." };
  }

  const res = await prisma.topicIdea.updateMany({
    where: { id, organizationId: tenant.organizationId },
    // campaignId ?? null lets the user clear the campaign link.
    data: { ...parsed.data, campaignId: parsed.data.campaignId ?? null },
  });
  if (res.count === 0) return { ok: false, error: "Thema nicht gefunden." };

  rev(clientId);
  return { ok: true };
}

export async function deleteTopicAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.topicIdea.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}

/**
 * Workflow: build a briefing from a topic idea using the (mock) briefing
 * manager, pulling in the client's approved insights and no-gos.
 */
export async function buildBriefingFromTopicAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const topic = await prisma.topicIdea.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: { client: { select: { name: true } } },
  });
  if (!topic) return;

  const insights = await prisma.clientInsight.findMany({
    where: {
      clientId: topic.clientId,
      organizationId: tenant.organizationId,
      status: "APPROVED",
    },
    select: { insightType: true, title: true },
  });

  const briefing = buildBriefing({
    topicTitle: topic.title,
    topicDescription: topic.description,
    mediaAngle: topic.mediaAngle,
    targetMediaType: topic.targetMediaType,
    clientName: topic.client.name,
    keyInsights: insights
      .filter((i) => i.insightType !== "NO_GO")
      .map((i) => i.title),
    noGos: insights.filter((i) => i.insightType === "NO_GO").map((i) => i.title),
  });

  await prisma.briefing.create({
    data: {
      organizationId: tenant.organizationId,
      clientId: topic.clientId,
      campaignId: topic.campaignId,
      topicIdeaId: topic.id,
      status: "DRAFT",
      ...briefing,
    },
  });

  await prisma.topicIdea.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "PITCHED" },
  });

  rev(clientId);
}
