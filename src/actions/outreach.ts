"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { outreachSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { runPitchAgent } from "@/lib/ai/agents/pitchAgent";
import { runFollowUpAgent } from "@/lib/ai/agents/followUpAgent";
import {
  buildClientEvidence,
  getRuleSetForType,
  runAndStoreQuality,
} from "@/lib/quality/reportStore";

// Make sure both the campaign and the media contact belong to the tenant
// before an outreach links them together.
async function relationsBelongToOrg(
  campaignId: string,
  mediaContactId: string,
  organizationId: string,
) {
  const [campaign, contact] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true },
    }),
    prisma.mediaContact.findFirst({
      where: { id: mediaContactId, organizationId },
      select: { id: true },
    }),
  ]);
  return Boolean(campaign) && Boolean(contact);
}

export async function createOutreachAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let tenant;
  try {
    tenant = await requireWriteAccess();
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = outreachSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (
    !(await relationsBelongToOrg(
      parsed.data.campaignId,
      parsed.data.mediaContactId,
      tenant.organizationId,
    ))
  ) {
    return { ok: false, error: "Ungültige Kampagne oder Medienkontakt." };
  }

  await prisma.outreach.create({
    data: { ...parsed.data, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/outreach");
  redirect("/dashboard/outreach");
}

export async function updateOutreachAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let tenant;
  try {
    tenant = await requireWriteAccess();
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: e.message };
    throw e;
  }

  const parsed = outreachSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (
    !(await relationsBelongToOrg(
      parsed.data.campaignId,
      parsed.data.mediaContactId,
      tenant.organizationId,
    ))
  ) {
    return { ok: false, error: "Ungültige Kampagne oder Medienkontakt." };
  }

  const result = await prisma.outreach.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { ok: false, error: "Outreach nicht gefunden." };
  }

  revalidatePath("/dashboard/outreach");
  redirect("/dashboard/outreach");
}

export async function deleteOutreachAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  await prisma.outreach.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/outreach");
}

/**
 * Workflow: generate pitch + follow-up email drafts for an outreach using the
 * (mock) outreach manager, filling pitchEmail/followUpEmail.
 */
export async function generatePitchAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  const outreach = await prisma.outreach.findFirst({
    where: { id, organizationId: tenant.organizationId },
    include: {
      campaign: { select: { client: { select: { id: true, name: true } } } },
      mediaContact: { select: { firstName: true, outlet: true } },
    },
  });
  if (!outreach) return;

  const agentCtx = {
    organizationId: tenant.organizationId,
    userId: tenant.userId,
  };
  const clientName = outreach.campaign.client.name;
  const topicTitle = outreach.agreedTopic ?? outreach.subject;

  const [pitch, followUp] = await Promise.all([
    runPitchAgent(
      {
        clientName,
        topicTitle,
        contactFirstName: outreach.mediaContact.firstName,
        contactOutlet: outreach.mediaContact.outlet,
      },
      agentCtx,
    ),
    runFollowUpAgent(
      {
        variant: "THREE_DAYS",
        clientName,
        topicTitle,
        contactFirstName: outreach.mediaContact.firstName,
      },
      agentCtx,
    ),
  ]);

  await prisma.outreach.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      pitchEmail: pitch.pitchEmail,
      followUpEmail: followUp.message,
    },
  });

  // Quality review of the generated pitch + follow-up.
  const clientId = outreach.campaign.client.id;
  const evidence = await buildClientEvidence(clientId, tenant.organizationId);
  await Promise.all([
    runAndStoreQuality({
      entityType: "PITCH",
      entityId: id,
      organizationId: tenant.organizationId,
      text: pitch.pitchEmail,
      evidence,
      ruleSet: await getRuleSetForType(tenant.organizationId, "PITCH"),
    }),
    runAndStoreQuality({
      entityType: "FOLLOW_UP",
      entityId: id,
      organizationId: tenant.organizationId,
      text: followUp.message,
      evidence,
      ruleSet: await getRuleSetForType(tenant.organizationId, "FOLLOW_UP"),
    }),
  ]);

  revalidatePath("/dashboard/outreach");
}
