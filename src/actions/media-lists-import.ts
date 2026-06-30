"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import type { FormState } from "@/lib/form";
import { parseMediaLists } from "@/lib/media/importers/mediaListsImporter";

export interface MediaListsImportState extends FormState {
  imported?: number;
  skipped?: number;
  total?: number;
}

/**
 * Import media contacts from the agency's own media-list sheets (Medienfreunde,
 * Podcaster, Radiosender). De-dupes against existing contacts (by e-mail, or by
 * name+outlet for entries without an e-mail), so it is re-runnable.
 */
export async function importMediaListsAction(
  _prev: MediaListsImportState,
  formData: FormData,
): Promise<MediaListsImportState> {
  let tenant;
  try {
    tenant = await requireWriteAccess();
  } catch (e) {
    if (e instanceof AccessDeniedError) return { ok: false, error: e.message };
    throw e;
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Excel-Datei (.xlsx) auswählen." };
  }

  let contacts;
  try {
    contacts = parseMediaLists(await file.arrayBuffer());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.",
    };
  }

  if (contacts.length === 0) {
    return {
      ok: false,
      error:
        "Keine Medienkontakte gefunden (Blätter Medienfreunde/Podcaster/Radiosender).",
    };
  }

  try {
    const existing = await prisma.mediaContact.findMany({
      where: { organizationId: tenant.organizationId },
      select: { email: true, firstName: true, outlet: true },
    });
    const key = (c: {
      email?: string | null;
      firstName: string;
      outlet?: string | null;
    }) =>
      (c.email || `${c.firstName}|${c.outlet ?? ""}`).trim().toLowerCase();
    const existingKeys = new Set(existing.map(key));

    const toCreate = contacts.filter((c) => !existingKeys.has(key(c)));

    if (toCreate.length > 0) {
      await prisma.mediaContact.createMany({
        data: toCreate.map((c) => ({
          organizationId: tenant.organizationId,
          firstName: c.firstName.slice(0, 120) || "Unbekannt",
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          outlet: c.outlet,
          beat: c.beat,
          notes: c.notes,
          sourceType: "EXCEL" as const,
        })),
      });
    }

    revalidatePath("/dashboard/media-contacts");
    return {
      ok: true,
      total: contacts.length,
      imported: toCreate.length,
      skipped: contacts.length - toCreate.length,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        "Import fehlgeschlagen beim Speichern: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }
}
