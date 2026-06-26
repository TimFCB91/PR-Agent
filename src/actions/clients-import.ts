"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import type { FormState } from "@/lib/form";
import { parseClientsExcel } from "@/lib/clients/clientsExcelImport";

export interface ClientsImportState extends FormState {
  imported?: number;
  skipped?: number;
  total?: number;
}

/**
 * Import clients from the agency's "KUNDEN" Excel sheet. Existing clients
 * (matched by name, case-insensitive) are skipped so the import can be re-run
 * without creating duplicates.
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

  // Skip names that already exist (case-insensitive), incl. the topic pool.
  const existing = await prisma.client.findMany({
    where: { organizationId: tenant.organizationId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));

  const toCreate = rows.filter(
    (r) => !existingNames.has(r.name.trim().toLowerCase()),
  );

  if (toCreate.length > 0) {
    await prisma.client.createMany({
      data: toCreate.map((r) => ({
        organizationId: tenant.organizationId,
        name: r.name,
        tier: r.tier,
        package: r.package,
        responsiblePerson: r.responsiblePerson,
        onboardingDate: r.onboardingDate,
        placementGoal: r.placementGoal,
        notes: r.notes,
        status: "ACTIVE" as const,
      })),
    });
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/uebersicht");
  return {
    ok: true,
    total: rows.length,
    imported: toCreate.length,
    skipped: rows.length - toCreate.length,
  };
}
