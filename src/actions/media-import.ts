"use server";

import { revalidatePath } from "next/cache";
import type { MediaSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { writeAccess } from "@/lib/action-helpers";
import type { FormState } from "@/lib/form";
import { importCsv } from "@/lib/media/importers/csvImporter";
import { importExcel } from "@/lib/media/importers/excelImporter";
import { importZimpelCsv, importZimpelExcel } from "@/lib/media/importers/zimpelImporter";
import { validateRecords, findDuplicate } from "@/lib/media/importers/importValidator";
import type { MappedContact } from "@/lib/media/importers/importMapper";

export interface ImportState extends FormState {
  imported?: number;
  updated?: number;
  skipped?: number;
  invalid?: number;
  duplicates?: number;
  rowErrors?: string[];
}

// Fold recognised-but-uncolumned fields + leftover metadata into notes, so no
// imported information is lost (MediaContact has no website/region columns).
function composeNotes(c: MappedContact): string | undefined {
  const parts: string[] = [];
  if (c.notes) parts.push(c.notes);
  if (c.website) parts.push(`Website: ${c.website}`);
  if (c.region) parts.push(`Region: ${c.region}`);
  if (c.country) parts.push(`Land: ${c.country}`);
  if (c.mediaType) parts.push(`Medientyp: ${c.mediaType}`);
  if (c.topics) parts.push(`Themen: ${c.topics}`);
  for (const [k, v] of Object.entries(c.metadata)) parts.push(`${k}: ${v}`);
  return parts.length ? parts.join("\n") : undefined;
}

/**
 * Import media contacts from an uploaded CSV / Excel / Zimpel file. Maps columns
 * onto MediaContact, validates, detects duplicates (skip | update | new) and
 * records a MediaImportSession. Everything is organizationId-scoped.
 */
export async function importMediaContactsFileAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const acc = await writeAccess();
  if (acc.errorState) return acc.errorState;
  const { tenant } = acc;

  const file = formData.get("file");
  const source = String(formData.get("sourceType") || "csv") as MediaSourceType;
  const onDuplicate = String(formData.get("onDuplicate") || "skip"); // skip|update|new
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Datei auswählen." };
  }

  const isExcel = /\.xlsx?$/i.test(file.name);
  let parsed;
  try {
    if (source === "EXCEL" || (source === "ZIMPEL" && isExcel)) {
      parsed = source === "ZIMPEL"
        ? importZimpelExcel(await file.arrayBuffer())
        : importExcel(await file.arrayBuffer());
    } else if (source === "ZIMPEL") {
      parsed = importZimpelCsv(await file.text());
    } else {
      parsed = importCsv(await file.text());
    }
  } catch (e) {
    return { ok: false, error: `Datei konnte nicht gelesen werden: ${String(e)}` };
  }

  const validated = validateRecords(parsed.records);
  const valid = validated.filter((v) => v.valid);
  const rowErrors = validated
    .filter((v) => !v.valid)
    .map((v) => `Zeile ${v.row}: ${v.errors.join(" ")}`);

  const session = await prisma.mediaImportSession.create({
    data: {
      organizationId: tenant.organizationId,
      sourceType: source,
      importedByUserId: tenant.userId,
      fileName: file.name,
      importedRecords: parsed.totalRows,
      validRecords: valid.length,
      invalidRecords: rowErrors.length,
      status: "PROCESSING",
    },
    select: { id: true },
  });

  const existing = await prisma.mediaContact.findMany({
    where: { organizationId: tenant.organizationId },
    select: { id: true, firstName: true, lastName: true, email: true, outlet: true, notes: true },
  });
  // include website via notes? we only need email/name/outlet for dedup here.

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const v of valid) {
    const c = v.contact;
    const dup = findDuplicate(c, existing);
    if (dup) {
      duplicates++;
      if (onDuplicate === "skip") {
        skipped++;
        continue;
      }
      if (onDuplicate === "update") {
        await prisma.mediaContact.updateMany({
          where: { id: dup.existingId, organizationId: tenant.organizationId },
          data: {
            email: c.email ?? undefined,
            phone: c.phone ?? undefined,
            outlet: c.outlet ?? undefined,
            beat: c.beat ?? undefined,
            notes: composeNotes(c) ?? undefined,
          },
        });
        updated++;
        continue;
      }
      // onDuplicate === "new": fall through and create anyway.
    }

    await prisma.mediaContact.create({
      data: {
        organizationId: tenant.organizationId,
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? (c.outlet ? "Redaktion" : "Unbekannt"),
        email: c.email ?? null,
        phone: c.phone ?? null,
        outlet: c.outlet ?? null,
        beat: c.beat ?? null,
        notes: composeNotes(c),
        sourceType: source,
        sourceImportId: session.id,
        sourceUrls: c.website ? [c.website] : [],
        importedAt: new Date(),
        verificationStatus: "UNVERIFIED",
      },
    });
    imported++;
    existing.push({
      id: "new",
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email ?? null,
      outlet: c.outlet ?? null,
      notes: null,
    });
  }

  await prisma.mediaImportSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", notes: `${imported} neu, ${updated} aktualisiert, ${skipped} übersprungen` },
  });

  revalidatePath("/dashboard/media-contacts");

  return {
    ok: true,
    imported,
    updated,
    skipped,
    duplicates,
    invalid: rowErrors.length,
    rowErrors: rowErrors.slice(0, 20),
  };
}
