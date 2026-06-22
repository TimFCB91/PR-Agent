"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { clientSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

export async function createClientAction(
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

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.client.create({
    data: { ...parsed.data, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function updateClientAction(
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

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // Scope the update by organizationId so records of other tenants are
  // unreachable even if an id is guessed.
  const result = await prisma.client.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { ok: false, error: "Kunde nicht gefunden." };
  }

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  await prisma.client.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/clients");
}
