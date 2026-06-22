"use server";

import { revalidatePath } from "next/cache";

import { requireWriteAccess } from "@/lib/tenant";
import {
  recomputeContact,
  recomputeAllContacts,
} from "@/lib/media/mediaIntelligence";

/** Recompute performance + preferences for one media contact from its history. */
export async function recomputeContactAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  await recomputeContact(id, tenant.organizationId);
  revalidatePath(`/dashboard/media-contacts/${id}`);
  revalidatePath("/dashboard/media-contacts");
}

/** Recompute media intelligence for all contacts of the organization. */
export async function recomputeAllContactsAction(): Promise<void> {
  const tenant = await requireWriteAccess();
  await recomputeAllContacts(tenant.organizationId);
  revalidatePath("/dashboard/media-contacts");
}
