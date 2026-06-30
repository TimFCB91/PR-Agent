import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { createCampaignAction } from "@/actions/campaigns";
import { PageHeader, EmptyState } from "@/components/ui";
import { CampaignForm } from "../campaign-form";

export default async function NewCampaignPage() {
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/campaigns");

  const clients = await prisma.client.findMany({
    where: { organizationId, isTopicPool: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <PageHeader title="Neue Kampagne" />
      {clients.length === 0 ? (
        <EmptyState message="Bitte legen Sie zuerst einen Kunden an." />
      ) : (
        <CampaignForm
          action={createCampaignAction}
          clients={clients}
          submitLabel="Anlegen"
        />
      )}
    </div>
  );
}
