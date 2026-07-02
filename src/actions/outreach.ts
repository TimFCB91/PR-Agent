"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { outreachSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { computeFollowUpDate } from "@/lib/outreach/outreachManager";
import { fallbackNotice } from "@/lib/ai/agents/runAgent";
import { runPitchAgent } from "@/lib/ai/agents/pitchAgent";
import { runFollowUpAgent } from "@/lib/ai/agents/followUpAgent";
import {
  buildClientEvidence,
  getRuleSetForType,
  runAndStoreQuality,
} from "@/lib/quality/reportStore";
import { gatherKnowledge, saveSourceRefs } from "@/lib/knowledge/sources";
import {
  getContactStatForPitch,
  recordInteraction,
  recomputeContact,
} from "@/lib/media/mediaIntelligence";

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
    data: {
      ...parsed.data,
      ...autoFollowUp(parsed.data),
      organizationId: tenant.organizationId,
    },
  });

  revalidatePath("/dashboard/outreach");
  redirect("/dashboard/outreach");
}

// When a first mail is marked as sent and no follow-up date was entered, derive
// it automatically (sentAt + N days), as described in the agency plan.
function autoFollowUp(data: {
  status: string;
  sentAt?: Date | null;
  nextFollowUpDate?: Date | null;
}): { nextFollowUpDate?: Date } {
  if (data.status === "SENT" && data.sentAt && !data.nextFollowUpDate) {
    return { nextFollowUpDate: computeFollowUpDate(data.sentAt) };
  }
  return {};
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
    data: { ...parsed.data, ...autoFollowUp(parsed.data) },
  });

  if (result.count === 0) {
    return { ok: false, error: "Outreach nicht gefunden." };
  }

  // Media intelligence: when a response is captured, log the interaction and
  // recompute the contact's performance + preferences.
  if (parsed.data.responseType) {
    const resultMap: Record<string, "NO_RESPONSE" | "INTERESTED" | "ACCEPTED" | "DECLINED"> = {
      NO_RESPONSE: "NO_RESPONSE",
      INTERESTED: "INTERESTED",
      ACCEPTED: "ACCEPTED",
      DECLINED: "DECLINED",
      NEEDS_MORE_INFO: "INTERESTED",
      OUT_OF_OFFICE: "NO_RESPONSE",
      WRONG_CONTACT: "NO_RESPONSE",
    };
    await recordInteraction({
      organizationId: tenant.organizationId,
      mediaContactId: parsed.data.mediaContactId,
      outreachId: id,
      interactionType: "RESPONSE",
      result: resultMap[parsed.data.responseType],
      topicTitle: parsed.data.agreedTopic,
      mediaAngle: parsed.data.acceptedAngle,
      notes: parsed.data.responseSummary,
    });
    await recomputeContact(parsed.data.mediaContactId, tenant.organizationId);
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
  const clientId = outreach.campaign.client.id;

  // Mandatory retrieval step.
  const gathered = await gatherKnowledge(clientId, tenant.organizationId, topicTitle);

  // Media intelligence: this contact's track record informs the pitch.
  const contactStat = await getContactStatForPitch(
    outreach.mediaContactId,
    tenant.organizationId,
  );

  const [pitchRun, followUpRun] = await Promise.all([
    runPitchAgent(
      {
        clientName,
        topicTitle,
        contactFirstName: outreach.mediaContact.firstName,
        contactOutlet: outreach.mediaContact.outlet,
        sources: gathered.chunks,
        contactStats: contactStat
          ? {
              acceptanceRate: contactStat.acceptanceRate,
              replyRate: contactStat.replyRate,
              preferredAngles: contactStat.preferredAngles,
              lastSuccessfulTopic: contactStat.lastSuccessfulTopic,
            }
          : null,
      },
      agentCtx,
    ),
    runFollowUpAgent(
      {
        variant: "THREE_DAYS",
        clientName,
        topicTitle,
        contactFirstName: outreach.mediaContact.firstName,
        sources: gathered.chunks,
      },
      agentCtx,
    ),
  ]);

  const pitch = pitchRun.output;
  const followUp = followUpRun.output;
  const pitchNotice = fallbackNotice(pitchRun);
  const followUpNotice = fallbackNotice(followUpRun);

  await saveSourceRefs("PITCH", id, tenant.organizationId, pitch.sourceReferences);
  await saveSourceRefs("FOLLOW_UP", id, tenant.organizationId, followUp.sourceReferences);

  await prisma.outreach.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      pitchEmail: [pitchNotice, pitch.pitchEmail].filter(Boolean).join("\n\n"),
      followUpEmail: [followUpNotice, followUp.message].filter(Boolean).join("\n\n"),
    },
  });

  // Quality review of the generated pitch + follow-up.
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
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
}
