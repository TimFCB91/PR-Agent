"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/tenant";
import { runMediaResearchAgent } from "@/lib/media/mediaResearchAgent";
import { findDuplicate } from "@/lib/media/importers/importValidator";

/**
 * Research matching media for a campaign/topic. Results are stored as
 * MediaResearchResult with status SUGGESTED — never auto-imported. Org-scoped.
 */
export async function researchMediaAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const campaignId = String(formData.get("campaignId"));

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId: tenant.organizationId },
    include: { client: { select: { id: true, name: true, notes: true } } },
  });
  if (!campaign) return;

  const topicIdeaId = formData.get("topicIdeaId")
    ? String(formData.get("topicIdeaId"))
    : null;
  const topic = topicIdeaId
    ? await prisma.topicIdea.findFirst({
        where: { id: topicIdeaId, organizationId: tenant.organizationId },
        select: { id: true, title: true, targetMediaType: true },
      })
    : null;

  const region = formData.get("region") ? String(formData.get("region")) : null;
  const mediaType = formData.get("mediaType")
    ? String(formData.get("mediaType"))
    : topic?.targetMediaType ?? null;

  const { candidates } = await runMediaResearchAgent({
    clientName: campaign.client.name,
    industry: campaign.client.notes,
    topic: topic?.title ?? campaign.name,
    region,
    mediaType,
  });

  if (candidates.length > 0) {
    await prisma.mediaResearchResult.createMany({
      data: candidates.map((c) => ({
        organizationId: tenant.organizationId,
        clientId: campaign.client.id,
        campaignId: campaign.id,
        topicIdeaId: topic?.id ?? null,
        mediumName: c.mediumName,
        website: c.website,
        mediaType: c.mediaType,
        section: c.section,
        region: c.region,
        contactName: c.contactName,
        contactRole: c.contactRole,
        email: c.email,
        contactPageUrl: c.contactPageUrl,
        sourceUrls: c.sourceUrls,
        relevanceReason: c.relevanceReason,
        suggestedAngle: c.suggestedAngle,
        confidence: c.confidence,
        status: "SUGGESTED" as const,
      })),
    });
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
}

/**
 * Manually approve a research result -> create a real MediaContact (provenance:
 * internet_research). Duplicates are flagged, not silently created.
 */
export async function approveResearchResultAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));

  const result = await prisma.mediaResearchResult.findFirst({
    where: { id, organizationId: tenant.organizationId },
  });
  if (!result) return;

  const existing = await prisma.mediaContact.findMany({
    where: { organizationId: tenant.organizationId },
    select: { id: true, firstName: true, lastName: true, email: true, outlet: true },
  });
  const dup = findDuplicate(
    { outlet: result.mediumName, email: result.email ?? undefined, website: result.website ?? undefined, metadata: {} },
    existing,
  );
  if (dup) {
    await prisma.mediaResearchResult.updateMany({
      where: { id, organizationId: tenant.organizationId },
      data: { status: "DUPLICATE" },
    });
    revalidatePath(`/dashboard/campaigns/${result.campaignId ?? ""}`);
    return;
  }

  const hasSource = result.sourceUrls.length > 0;
  const notes = [
    result.relevanceReason ? `Relevanz: ${result.relevanceReason}` : null,
    result.suggestedAngle ? `Winkel: ${result.suggestedAngle}` : null,
    result.website ? `Website: ${result.website}` : null,
    result.region ? `Region: ${result.region}` : null,
    result.mediaType ? `Medientyp: ${result.mediaType}` : null,
    result.contactPageUrl ? `Kontaktseite: ${result.contactPageUrl}` : null,
    result.sourceUrls.length ? `Quellen: ${result.sourceUrls.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await prisma.mediaContact.create({
    data: {
      organizationId: tenant.organizationId,
      firstName: "",
      lastName: result.contactName ?? "Redaktion",
      email: result.email,
      outlet: result.mediumName,
      beat: result.section,
      notes: notes || null,
      sourceType: "INTERNET_RESEARCH",
      sourceUrls: result.sourceUrls,
      importedAt: new Date(),
      verifiedAt: hasSource ? new Date() : null,
      verificationStatus: hasSource ? "SOURCE_VERIFIED" : "UNVERIFIED",
    },
  });

  await prisma.mediaResearchResult.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "IMPORTED" },
  });

  revalidatePath(`/dashboard/campaigns/${result.campaignId ?? ""}`);
  revalidatePath("/dashboard/media-contacts");
}

export async function rejectResearchResultAction(formData: FormData): Promise<void> {
  const tenant = await requireWriteAccess();
  const id = String(formData.get("id"));
  const result = await prisma.mediaResearchResult.updateMany({
    where: { id, organizationId: tenant.organizationId },
    data: { status: "REJECTED" },
  });
  if (result.count > 0) {
    revalidatePath("/dashboard/campaigns");
  }
}
