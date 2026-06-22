"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { briefingSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { buildArticleDraft } from "@/lib/articles/articleBuilder";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

// Confirm optional foreign keys belong to the org.
async function validRefs(
  data: {
    campaignId?: string;
    topicIdeaId?: string;
    mediaContactId?: string;
  },
  organizationId: string,
): Promise<boolean> {
  const checks: Array<Promise<boolean>> = [];
  if (data.campaignId)
    checks.push(
      prisma.campaign
        .findFirst({
          where: { id: data.campaignId, organizationId },
          select: { id: true },
        })
        .then(Boolean),
    );
  if (data.topicIdeaId)
    checks.push(
      prisma.topicIdea
        .findFirst({
          where: { id: data.topicIdeaId, organizationId },
          select: { id: true },
        })
        .then(Boolean),
    );
  if (data.mediaContactId)
    checks.push(
      prisma.mediaContact
        .findFirst({
          where: { id: data.mediaContactId, organizationId },
          select: { id: true },
        })
        .then(Boolean),
    );
  const results = await Promise.all(checks);
  return results.every(Boolean);
}

export async function createBriefingAction(
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

  const parsed = briefingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await validRefs(parsed.data, tenant.organizationId))) {
    return { ok: false, error: "Ungültige Verknüpfung." };
  }

  await prisma.briefing.create({
    data: { ...parsed.data, clientId, organizationId: tenant.organizationId },
  });

  rev(clientId);
  return { ok: true };
}

export async function deleteBriefingAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.briefing.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}

/**
 * Workflow: build an article draft from a briefing using the (mock) article
 * builder, honouring the first available writing rule set.
 */
export async function buildArticleFromBriefingAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const briefing = await prisma.briefing.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: { client: { select: { name: true } } },
  });
  if (!briefing) return;

  const ruleSet = await prisma.writingRuleSet.findFirst({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "asc" },
  });

  const article = buildArticleDraft(
    {
      briefingTitle: briefing.title,
      angle: briefing.angle,
      keyMessages: briefing.keyMessages,
      suggestedStructure: briefing.suggestedStructure,
      clientName: briefing.client.name,
      targetAudience: briefing.targetAudience,
    },
    ruleSet
      ? {
          toneOfVoice: ruleSet.toneOfVoice,
          preferredStructure: ruleSet.preferredStructure,
          minWords: ruleSet.minWords,
          maxWords: ruleSet.maxWords,
          forbiddenPhrases: ruleSet.forbiddenPhrases,
        }
      : undefined,
  );

  await prisma.articleDraft.create({
    data: {
      organizationId: tenant.organizationId,
      clientId: briefing.clientId,
      campaignId: briefing.campaignId,
      briefingId: briefing.id,
      status: "DRAFT",
      ...article,
    },
  });

  await prisma.briefing.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "DELIVERED" },
  });

  rev(clientId);
}
