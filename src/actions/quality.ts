"use server";

import { revalidatePath } from "next/cache";
import type { TextEntityType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { rewriteText } from "@/lib/writing/rewriteEngine";
import {
  buildClientEvidence,
  getRuleSetForType,
  runAndStoreQuality,
  setReportStatus,
} from "@/lib/quality/reportStore";

interface EntityText {
  text: string;
  clientId: string;
}

function isEntityType(v: string): v is TextEntityType {
  return ["PITCH", "FOLLOW_UP", "BRIEFING", "ARTICLE"].includes(v);
}

// Resolve the editable text + owning client for an entity.
async function getEntityText(
  entityType: TextEntityType,
  entityId: string,
  organizationId: string,
): Promise<EntityText | null> {
  if (entityType === "ARTICLE") {
    const a = await prisma.articleDraft.findFirst({
      where: { id: entityId, organizationId },
      select: { articleText: true, clientId: true },
    });
    return a ? { text: a.articleText ?? "", clientId: a.clientId } : null;
  }
  if (entityType === "BRIEFING") {
    const b = await prisma.briefing.findFirst({
      where: { id: entityId, organizationId },
      select: { keyMessages: true, clientId: true },
    });
    return b ? { text: b.keyMessages ?? "", clientId: b.clientId } : null;
  }
  // PITCH / FOLLOW_UP live on Outreach.
  const o = await prisma.outreach.findFirst({
    where: { id: entityId, organizationId },
    select: {
      pitchEmail: true,
      followUpEmail: true,
      campaign: { select: { clientId: true } },
    },
  });
  if (!o) return null;
  return {
    text: (entityType === "PITCH" ? o.pitchEmail : o.followUpEmail) ?? "",
    clientId: o.campaign.clientId,
  };
}

async function setEntityText(
  entityType: TextEntityType,
  entityId: string,
  organizationId: string,
  text: string,
): Promise<void> {
  if (entityType === "ARTICLE") {
    await prisma.articleDraft.updateMany({
      where: { id: entityId, organizationId },
      data: { articleText: text },
    });
  } else if (entityType === "BRIEFING") {
    await prisma.briefing.updateMany({
      where: { id: entityId, organizationId },
      data: { keyMessages: text },
    });
  } else {
    await prisma.outreach.updateMany({
      where: { id: entityId, organizationId },
      data: entityType === "PITCH" ? { pitchEmail: text } : { followUpEmail: text },
    });
  }
}

function revalidate(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/outreach");
}

/**
 * "Text überarbeiten": run the conservative rewrite engine (never adds facts),
 * persist the improved text, then re-run the quality checks (status -> REVISED).
 */
export async function rewriteTextAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const entityType = String(formData.get("entityType"));
  const entityId = String(formData.get("entityId"));
  if (!isEntityType(entityType)) return;

  const entity = await getEntityText(entityType, entityId, tenant.organizationId);
  if (!entity) return;

  const ruleSet = await getRuleSetForType(tenant.organizationId, entityType);
  const rewritten = rewriteText(entity.text, ruleSet?.forbiddenPhrases ?? []);
  if (rewritten.changed) {
    await setEntityText(entityType, entityId, tenant.organizationId, rewritten.text);
  }

  const evidence = await buildClientEvidence(entity.clientId, tenant.organizationId);
  const report = await runAndStoreQuality({
    entityType,
    entityId,
    organizationId: tenant.organizationId,
    text: rewritten.text,
    evidence,
    ruleSet,
  });

  // Mark as revised unless hard fact problems remain.
  if (report.status !== "NEEDS_REVIEW") {
    await setReportStatus(entityType, entityId, tenant.organizationId, "REVISED");
  }

  revalidate(entity.clientId);
}

/**
 * "Manuell freigeben". Hard rule: never approve when fact safety failed.
 */
export async function approveTextAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const entityType = String(formData.get("entityType"));
  const entityId = String(formData.get("entityId"));
  if (!isEntityType(entityType)) return;

  const row = await prisma.textQualityReport.findFirst({
    where: { entityType, entityId, organizationId: tenant.organizationId },
  });
  if (!row) return;

  // Block approval on fact risks.
  const report = row.report as { factSafety?: { passed?: boolean } } | null;
  if (report?.factSafety?.passed === false) return;

  await setReportStatus(entityType, entityId, tenant.organizationId, "APPROVED");

  // Reflect approval on the underlying entity where it has its own status.
  if (entityType === "ARTICLE") {
    await prisma.articleDraft.updateMany({
      where: { id: entityId, organizationId: tenant.organizationId },
      data: { status: "APPROVED" },
    });
  } else if (entityType === "BRIEFING") {
    await prisma.briefing.updateMany({
      where: { id: entityId, organizationId: tenant.organizationId },
      data: { status: "APPROVED" },
    });
  } else if (entityType === "PITCH") {
    await prisma.outreach.updateMany({
      where: { id: entityId, organizationId: tenant.organizationId },
      data: { status: "READY" },
    });
  }

  const entity = await getEntityText(entityType, entityId, tenant.organizationId);
  if (entity) revalidate(entity.clientId);
}

/** "Ablehnen". */
export async function rejectTextAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const entityType = String(formData.get("entityType"));
  const entityId = String(formData.get("entityId"));
  if (!isEntityType(entityType)) return;

  await setReportStatus(entityType, entityId, tenant.organizationId, "REJECTED");

  if (entityType === "ARTICLE") {
    await prisma.articleDraft.updateMany({
      where: { id: entityId, organizationId: tenant.organizationId },
      data: { status: "ARCHIVED" },
    });
  }

  const entity = await getEntityText(entityType, entityId, tenant.organizationId);
  if (entity) revalidate(entity.clientId);
}
