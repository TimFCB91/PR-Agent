"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { publicationSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

async function validRefs(
  data: { campaignId?: string; mediaContactId?: string },
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
  if (data.mediaContactId)
    checks.push(
      prisma.mediaContact
        .findFirst({
          where: { id: data.mediaContactId, organizationId },
          select: { id: true },
        })
        .then(Boolean),
    );
  return (await Promise.all(checks)).every(Boolean);
}

export async function createPublicationAction(
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

  const parsed = publicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await validRefs(parsed.data, tenant.organizationId))) {
    return { ok: false, error: "Ungültige Verknüpfung." };
  }

  await prisma.publication.create({
    data: { ...parsed.data, clientId, organizationId: tenant.organizationId },
  });

  rev(clientId);
  return { ok: true };
}

export async function updatePublicationAction(
  clientId: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = publicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await validRefs(parsed.data, tenant.organizationId))) {
    return { ok: false, error: "Ungültige Verknüpfung." };
  }

  const res = await prisma.publication.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      ...parsed.data,
      campaignId: parsed.data.campaignId ?? null,
      mediaContactId: parsed.data.mediaContactId ?? null,
    },
  });
  if (res.count === 0)
    return { ok: false, error: "Veröffentlichung nicht gefunden." };

  rev(clientId);
  return { ok: true };
}

export async function deletePublicationAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.publication.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}
