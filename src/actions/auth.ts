"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema, loginSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Registers a brand new organization together with its first user, who
 * automatically becomes the OWNER. This is the entry point that bootstraps a
 * tenant.
 */
export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const { organizationName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Diese E-Mail-Adresse ist bereits vergeben." };
  }

  // Ensure a unique organization slug.
  const base = slugify(organizationName) || "org";
  let slug = base;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }

  const passwordHash = await hashPassword(password);

  await prisma.organization.create({
    data: {
      name: organizationName,
      slug,
      users: {
        create: {
          name,
          email,
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });

  // Sign the new owner in straight away.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });

  return { ok: true };
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "E-Mail oder Passwort ist ungültig." };
    }
    // Re-throw redirect errors so Next.js can perform the navigation.
    throw error;
  }

  return { ok: true };
}
