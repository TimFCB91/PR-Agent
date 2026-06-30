"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { placementSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function createPlacementAction(
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

  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.placement.create({
    data: {
      ...parsed.data,
      publishedAt: parsed.data.state === "PUBLISHED" ? new Date() : null,
      clientId,
      organizationId: tenant.organizationId,
    },
  });

  rev(clientId);
  return { ok: true };
}

export async function updatePlacementAction(
  clientId: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const res = await prisma.placement.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      ...parsed.data,
      publishedAt: parsed.data.state === "PUBLISHED" ? new Date() : null,
    },
  });
  if (res.count === 0) return { ok: false, error: "Platzierung nicht gefunden." };

  rev(clientId);
  return { ok: true };
}

/** Quick-edit the client's guaranteed placement count (Zusagenziel). */
export async function setPlacementGoalAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));
  const raw = String(formData.get("placementGoal")).trim();
  const n = parseInt(raw, 10);
  const goal =
    raw === "" || Number.isNaN(n) ? null : Math.max(0, Math.min(100000, n));

  await prisma.client.updateMany({
    where: { id: clientId, organizationId: tenant.organizationId },
    data: { placementGoal: goal },
  });
  rev(clientId);
}

export async function deletePlacementAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.placement.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}
