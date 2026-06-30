"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenant, requireWriteAccess } from "@/lib/tenant";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { hashPassword, verifyPassword } from "@/lib/password";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktuelles Passwort erforderlich."),
    newPassword: z.string().min(8, "Mindestens 8 Zeichen."),
    confirmPassword: z.string().min(1, "Bitte bestätigen."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwörter stimmen nicht überein.",
  });

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

/** Change the signed-in user's own password (verifies the current one). */
export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const tenant = await requireTenant();

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { id: tenant.userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Benutzer nicht gefunden." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Aktuelles Passwort ist falsch." };

  await prisma.user.update({
    where: { id: tenant.userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

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
