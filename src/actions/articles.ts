"use server";

import { revalidatePath } from "next/cache";

import type { ArticleStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { writeAccess } from "@/lib/action-helpers";
import { articleSchema } from "@/lib/validations";
import { fieldErrorsFromZod, type FormState } from "@/lib/form";
import { checkArticle } from "@/lib/articles/articleQualityChecker";

function rev(clientId: string) {
  revalidatePath(`/dashboard/clients/${clientId}`);
}

async function validRefs(
  data: { campaignId?: string; briefingId?: string },
  organizationId: string,
): Promise<boolean> {
  const checks: Array<Promise<boolean>> = [];
  if (data.campaignId)
    checks.push(
      prisma.campaign
        .findFirst({
          where: { id: data.campaignId, organizationId },
          select: { id: true },
        })
        .then(Boolean),
    );
  if (data.briefingId)
    checks.push(
      prisma.briefing
        .findFirst({
          where: { id: data.briefingId, organizationId },
          select: { id: true },
        })
        .then(Boolean),
    );
  return (await Promise.all(checks)).every(Boolean);
}

export async function createArticleAction(
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

  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  if (!(await validRefs(parsed.data, tenant.organizationId))) {
    return { ok: false, error: "Ungültige Verknüpfung." };
  }

  await prisma.articleDraft.create({
    data: { ...parsed.data, clientId, organizationId: tenant.organizationId },
  });

  rev(clientId);
  return { ok: true };
}

export async function updateArticleStatusAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));
  const status = String(formData.get("status"));
  const allowed = ["DRAFT", "REVIEW", "APPROVED", "SENT", "PUBLISHED", "ARCHIVED"];
  if (!allowed.includes(status)) return;

  await prisma.articleDraft.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: status as ArticleStatus },
  });
  rev(clientId);
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  await prisma.articleDraft.deleteMany({
    where: { id, organizationId: tenant.organizationId },
  });
  rev(clientId);
}

/**
 * Workflow: run the quality checker over an article draft against the first
 * writing rule set and write the result into qualityNotes.
 */
export async function checkArticleQualityAction(
  formData: FormData,
): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const clientId = String(formData.get("clientId"));

  const article = await prisma.articleDraft.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!article) return;

  const ruleSet = await prisma.writingRuleSet.findFirst({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "asc" },
  });

  const result = checkArticle(article.articleText ?? "", {
    minWords: ruleSet?.minWords,
    maxWords: ruleSet?.maxWords,
    forbiddenPhrases: ruleSet?.forbiddenPhrases,
  });

  const notes = [
    `Qualitäts-Score: ${result.score}/100 (${result.wordCount} Wörter)`,
    result.passed ? "Keine Regelverstöße gefunden." : "Hinweise:",
    ...result.issues.map((i) => `- ${i}`),
  ].join("\n");

  await prisma.articleDraft.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { qualityNotes: notes },
  });

  rev(clientId);
}
