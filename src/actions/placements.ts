"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { placementSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { parseReportingList } from "@/lib/clients/reportingListImport";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export interface ReportingImportState extends FormState {
  imported?: number;
  goal?: number;
}

/**
 * Import a per-client Reporting-Liste (xlsx) → replaces this client's
 * placements with the rows from the "Übersicht" sheet and sets the goal.
 */
export async function importReportingListAction(
  clientId: string,
  _prev: ReportingImportState,
  formData: FormData,
): Promise<ReportingImportState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenant.organizationId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Kunde nicht gefunden." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Excel-Datei (.xlsx) auswählen." };
  }

  let parsed;
  try {
    parsed = parseReportingList(await file.arrayBuffer());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.",
    };
  }

  if (parsed.placements.length === 0) {
    return {
      ok: false,
      error: "Keine Platzierungen im Blatt 'Übersicht' gefunden.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.placement.deleteMany({
        where: { clientId, organizationId: tenant.organizationId },
      }),
      prisma.placement.createMany({
        data: parsed.placements.map((p) => ({
          organizationId: tenant.organizationId,
          clientId,
          position: p.position,
          type: p.type,
          state: p.state,
          medium: p.medium,
          publicationUrl: p.publicationUrl,
          note: p.note,
          publishedAt: p.state === "PUBLISHED" ? new Date() : null,
        })),
      }),
      ...(parsed.goal > 0
        ? [
            prisma.client.updateMany({
              where: { id: clientId, organizationId: tenant.organizationId },
              data: { placementGoal: parsed.goal },
            }),
          ]
        : []),
    ]);
  } catch (e) {
    return {
      ok: false,
      error:
        "Import fehlgeschlagen beim Speichern: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }

  rev(clientId);
  return { ok: true, imported: parsed.placements.length, goal: parsed.goal };
}

export async function createPlacementAction(
  clientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenant.organizationId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Kunde nicht gefunden." };

  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  await prisma.placement.create({
    data: {
      ...parsed.data,
      publishedAt: parsed.data.state === "PUBLISHED" ? new Date() : null,
      clientId,
      organizationId: tenant.organizationId,
    },
  });

  rev(clientId);
  return { ok: true };
}

export async function updatePlacementAction(
  clientId: string,
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const res = await prisma.placement.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: {
      ...parsed.data,
      publishedAt: parsed.data.state === "PUBLISHED" ? new Date() : null,
    },
  });
  if (res.count === 0) return { ok: false, error: "Platzierung nicht gefunden." };

  rev(clientId);
  return { ok: true };
}

/** Quick-edit the client's guaranteed placement count (Zusagenziel). */
export async function setPlacementGoalAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const clientId = String(formData.get("clientId"));
  const raw = String(formData.get("placementGoal")).trim();
  const n = parseInt(raw, 10);
  const goal =
    raw === "" || Number.isNaN(n) ? null : Math.max(0, Math.min(100000, n));

  await prisma.client.updateMany({
    where: { id: clientId, organizationId: tenant.organizationId },
    data: { placementGoal: goal },
  });
  rev(clientId);
}

export async function deletePlacementAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.placement.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}
