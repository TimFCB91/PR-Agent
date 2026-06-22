"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { mediaContactSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

export async function createMediaContactAction(
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

  const parsed = mediaContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.mediaContact.create({
    data: { ...parsed.data, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/media-contacts");
  redirect("/dashboard/media-contacts");
}

export async function updateMediaContactAction(
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

  const parsed = mediaContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const result = await prisma.mediaContact.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { ok: false, error: "Medienkontakt nicht gefunden." };
  }

  revalidatePath("/dashboard/media-contacts");
  redirect("/dashboard/media-contacts");
}

export async function deleteMediaContactAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  await prisma.mediaContact.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/media-contacts");
}
