"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { knowledgeSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function createKnowledgeAction(
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

  const parsed = knowledgeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.clientKnowledge.create({
    data: {
      ...parsed.data,
      manual: true,
      clientId,
      organizationId: tenant.organizationId,
    },
  });

  rev(clientId);
  return { ok: true };
}

export async function updateKnowledgeAction(
  clientId: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = knowledgeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // Touching an entry marks it manual so the auto-rebuild won't overwrite it.
  const res = await prisma.clientKnowledge.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { ...parsed.data, manual: true },
  });
  if (res.count === 0) return { ok: false, error: "Wissen nicht gefunden." };

  rev(clientId);
  return { ok: true };
}

export async function deleteKnowledgeAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.clientKnowledge.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}
