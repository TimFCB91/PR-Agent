"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { campaignSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

// Verify the referenced client belongs to the tenant before linking it.
async function clientBelongsToOrg(clientId: string, organizationId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  return Boolean(client);
}

export async function createCampaignAction(
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

  const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await clientBelongsToOrg(parsed.data.clientId, tenant.organizationId))) {
    return { ok: false, error: "Ungültiger Kunde." };
  }

  await prisma.campaign.create({
    data: { ...parsed.data, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/campaigns");
  redirect("/dashboard/campaigns");
}

export async function updateCampaignAction(
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

  const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await clientBelongsToOrg(parsed.data.clientId, tenant.organizationId))) {
    return { ok: false, error: "Ungültiger Kunde." };
  }

  const result = await prisma.campaign.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { ok: false, error: "Kampagne nicht gefunden." };
  }

  revalidatePath("/dashboard/campaigns");
  redirect("/dashboard/campaigns");
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  await prisma.campaign.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/campaigns");
}
