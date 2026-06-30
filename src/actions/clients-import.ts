"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess, AccessDeniedError } from "@/lib/tenant";
import type { FormState } from "@/lib/form";
import { parseClientsExcel, isLegendRow } from "@/lib/clients/clientsExcelImport";

export interface ClientsImportState extends FormState {
  imported?: number;
  updated?: number;
  removed?: number;
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
  let removed = 0;
  try {
    const org = tenant.organizationId;

    // Map existing client names -> id (skip the internal topic pool).
    const existing = await prisma.client.findMany({
      where: { organizationId: org, isTopicPool: false },
      select: { id: true, name: true, package: true },
    });

    // Clean up junk an earlier import created: legend rows, and the section
    // header rows (their package is the literal column label "Produkt").
    const junkIds = existing
      .filter((c) => isLegendRow(c.name) || c.package === "Produkt")
      .map((c) => c.id);
    if (junkIds.length > 0) {
      const del = await prisma.client.deleteMany({
        where: { id: { in: junkIds }, organizationId: org },
      });
      removed = del.count;
    }
    const idByName = new Map(
      existing.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    // Clients that already have placements — never overwrite those (the user
    // may have edited them in the app).
    const withPlacements = new Set(
      (
        await prisma.placement.findMany({
          where: { organizationId: org },
          distinct: ["clientId"],
          select: { clientId: true },
        })
      ).map((p) => p.clientId),
    );

    for (const r of rows) {
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

      let clientId = idByName.get(r.name.trim().toLowerCase());
      if (clientId) {
        await prisma.client.update({ where: { id: clientId }, data });
        updated++;
      } else {
        const c = await prisma.client.create({
          data: { organizationId: org, name: r.name, ...data },
          select: { id: true },
        });
        clientId = c.id;
        created++;
      }

      // Seed placements once (only if the client has none yet).
      if (r.placements.length > 0 && !withPlacements.has(clientId)) {
        await prisma.placement.createMany({
          data: r.placements.map((p) => ({
            organizationId: org,
            clientId: clientId as string,
            position: p.position,
            type: p.type,
            state: p.state,
            medium: p.medium,
            publicationUrl: p.publicationUrl,
          })),
        });
        withPlacements.add(clientId);
      }
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
  return { ok: true, total: rows.length, imported: created, updated, removed };
}
