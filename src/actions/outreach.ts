"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { outreachSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

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
