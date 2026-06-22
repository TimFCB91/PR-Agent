import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { updateCampaignAction } from "@/actions/campaigns";
import { PageHeader } from "@/components/ui";
import { CampaignForm } from "../../campaign-form";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/campaigns");

  const [campaign, clients] = await Promise.all([
    prisma.campaign.findFirst({ where: { id, organizationId } }),
    prisma.client.findMany({
      where: { organizationId, isTopicPool: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!campaign) notFound();

  const action = updateCampaignAction.bind(null, campaign.id);

  return (
    <div>
      <PageHeader title="Kampagne bearbeiten" />
      <CampaignForm
        action={action}
        clients={clients}
        defaults={campaign}
        submitLabel="Speichern"
      />
    </div>
  );
}
