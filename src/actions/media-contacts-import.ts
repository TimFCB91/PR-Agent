"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import { parseCsvWithHeader } from "@/lib/csv";
import { mediaContactSchema } from "@/lib/validations";
import type { FormState } from "@/lib/form";

export interface ImportState extends FormState {
  imported?: number;
  skipped?: number;
  rowErrors?: string[];
}

/**
 * Imports media contacts from an uploaded CSV file.
 *
 * Expected header columns (case-insensitive):
 *   firstName, lastName, email, phone, outlet, beat, notes
 *
 * Each row is validated individually; invalid rows are skipped and reported so
 * a single bad line does not abort the whole import. All created records are
 * scoped to the current organization.
 */
export async function importMediaContactsAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  let tenant;
  try {
    tenant = await requireWriteAccess();
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: e.message };
    throw e;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine CSV-Datei auswählen." };
  }

  const text = await file.text();
  const records = parseCsvWithHeader(text);

  if (records.length === 0) {
    return { ok: false, error: "Die Datei enthält keine Datenzeilen." };
  }

  const rowErrors: string[] = [];
  const toCreate: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    outlet?: string;
    beat?: string;
    notes?: string;
    organizationId: string;
  }> = [];

  records.forEach((record, index) => {
    const parsed = mediaContactSchema.safeParse({
      firstName: record.firstname,
      lastName: record.lastname,
      email: record.email,
      phone: record.phone,
      outlet: record.outlet,
      beat: record.beat,
      notes: record.notes,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      rowErrors.push(`Zeile ${index + 2}: ${first.message}`);
      return;
    }

    toCreate.push({ ...parsed.data, organizationId: tenant.organizationId });
  });

  if (toCreate.length > 0) {
    await prisma.mediaContact.createMany({ data: toCreate });
  }

  revalidatePath("/dashboard/media-contacts");

  return {
    ok: true,
    imported: toCreate.length,
    skipped: rowErrors.length,
    rowErrors: rowErrors.slice(0, 20),
  };
}
