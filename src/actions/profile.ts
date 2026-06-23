"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenant, requireWriteAccess } from "@/lib/tenant";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich."),
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse."),
});

const orgSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich."),
});

/** Update the signed-in user's own name and email. */
export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const tenant = await requireTenant();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // Email must stay unique across all users.
  const clash = await prisma.user.findFirst({
    where: { email: parsed.data.email, id: { not: tenant.userId } },
    select: { id: true },
  });
  if (clash) {
    return { ok: false, error: "Diese E-Mail wird bereits verwendet." };
  }

  await prisma.user.update({
    where: { id: tenant.userId },
    data: { name: parsed.data.name, email: parsed.data.email },
  });

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Rename the current organization (OWNER/ADMIN/EDITOR — write access). */
export async function updateOrganizationNameAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const tenant = await requireWriteAccess();

  const parsed = orgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: { name: parsed.data.name },
  });

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
