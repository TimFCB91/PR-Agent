"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import type { FormState } from "@/lib/form";
import { parseClientsExcel } from "@/lib/clients/clientsExcelImport";

export interface ClientsImportState extends FormState {
  imported?: number;
  updated?: number;
  total?: number;
}

/**
 * Import clients from the agency's "KUNDEN" Excel sheet. Matched by name
 * (case-insensitive): existing clients are UPDATED (so a re-run corrects their
 * data), new ones are created. Re-runnable without duplicates.
 */
export async function importClientsExcelAction(
  _prev: ClientsImportState,
  formData: FormData,
): Promise<ClientsImportState> {
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

  let rows;
  try {
    rows = parseClientsExcel(await file.arrayBuffer());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.",
    };
  }

  if (rows.length === 0) {
    return { ok: false, error: "Keine Kundenzeilen im KUNDEN-Blatt gefunden." };
  }

  let created = 0;
  let updated = 0;
  try {
    // Map existing client names -> id (skip the internal topic pool).
    const existing = await prisma.client.findMany({
      where: { organizationId: tenant.organizationId, isTopicPool: false },
      select: { id: true, name: true },
    });
    const idByName = new Map(
      existing.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    const toCreate: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      const id = idByName.get(r.name.trim().toLowerCase());
      const data = {
        tier: r.tier,
        package: r.package,
        responsiblePerson: r.responsiblePerson,
        onboardingDate: r.onboardingDate,
        placementGoal: r.placementGoal,
        status: r.status,
        // Only overwrite these when the Excel actually has a value, so we never
        // wipe data the user entered manually.
        ...(r.email ? { contactEmail: r.email } : {}),
        ...(r.phone ? { contactPhone: r.phone } : {}),
        ...(r.notes ? { notes: r.notes } : {}),
      };
      if (id) {
        await prisma.client.update({ where: { id }, data });
        updated++;
      } else {
        toCreate.push({
          organizationId: tenant.organizationId,
          name: r.name,
          ...data,
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.client.createMany({ data: toCreate as never });
      created = toCreate.length;
    }
  } catch (e) {
    return {
      ok: false,
      error:
        "Import fehlgeschlagen beim Speichern: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/uebersicht");
  return { ok: true, total: rows.length, imported: created, updated };
}
