"use server";

import { randomUUID } from "crypto";
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

/**
 * Enables (and lazily creates a token for) or disables the external read-only
 * report link of a campaign.
 */
export async function toggleCampaignShareAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const enable = formData.get("enable") === "true";

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: tenant.organizationId },
    select: { id: true, shareToken: true },
  });
  if (!campaign) return;

  await prisma.campaign.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      shareEnabled: enable,
      shareToken:
        enable && !campaign.shareToken
          ? randomUUID().replace(/-/g, "")
          : campaign.shareToken,
    },
  });

  revalidatePath(`/dashboard/campaigns/${id}`);
}
