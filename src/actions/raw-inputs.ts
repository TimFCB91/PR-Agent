"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { rawInputSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { processRawInput } from "@/lib/intake/intakeProcessor";
import { ingestDocument } from "@/lib/knowledge/ingest";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

export async function createRawInputAction(
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

  const parsed = rawInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const rawInput = await prisma.clientRawInput.create({
    data: {
      ...parsed.data,
      clientId,
      organizationId: tenant.organizationId,
      createdById: tenant.userId,
    },
    select: { id: true, title: true, rawText: true, sourceType: true, fileName: true },
  });

  // Build a durable, searchable KnowledgeDocument + chunks from the raw input.
  // The original raw input is preserved.
  if (rawInput.rawText && rawInput.rawText.trim()) {
    await ingestDocument({
      organizationId: tenant.organizationId,
      clientId,
      rawInputId: rawInput.id,
      title: rawInput.title,
      sourceType: rawInput.sourceType,
      sourceName: rawInput.fileName,
      content: rawInput.rawText,
    });
  }

  rev(clientId);
  return { ok: true };
}

export async function deleteRawInputAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.clientRawInput.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}

/**
 * Workflow: run the (mock) intake processor over a raw input and persist the
 * proposed insights as DRAFT ClientInsight rows. Later this is where an AI
 * extraction call would plug in.
 */
export async function processRawInputAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const raw = await prisma.clientRawInput.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!raw) return;

  const proposals = processRawInput({
    title: raw.title,
    rawText: raw.rawText,
    sourceType: raw.sourceType,
  });

  if (proposals.length > 0) {
    await prisma.clientInsight.createMany({
      data: proposals.map((p) => ({
        organizationId: tenant.organizationId,
        clientId: raw.clientId,
        insightType: p.insightType,
        title: p.title,
        content: p.content,
        confidence: p.confidence,
        status: "DRAFT" as const,
      })),
    });
  }

  await prisma.clientRawInput.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "PROCESSED" },
  });

  rev(clientId);
}
