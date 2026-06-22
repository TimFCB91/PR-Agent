"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { writingRuleSetSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";

export async function createWritingRuleSetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = writingRuleSetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.writingRuleSet.create({
    data: { ...parsed.data, organizationId: tenant.organizationId },
  });

  revalidatePath("/dashboard/settings/writing-rules");
  redirect("/dashboard/settings/writing-rules");
}

export async function updateWritingRuleSetAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = writingRuleSetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const result = await prisma.writingRuleSet.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: parsed.data,
  });
  if (result.count === 0) {
    return { ok: false, error: "Regelwerk nicht gefunden." };
  }

  revalidatePath("/dashboard/settings/writing-rules");
  redirect("/dashboard/settings/writing-rules");
}

export async function deleteWritingRuleSetAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  await prisma.writingRuleSet.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  revalidatePath("/dashboard/settings/writing-rules");
}
