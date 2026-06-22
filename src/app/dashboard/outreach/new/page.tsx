import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { createOutreachAction } from "@/actions/outreach";
import { PageHeader, EmptyState } from "@/components/ui";
import { OutreachForm } from "../outreach-form";

export default async function NewOutreachPage() {
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/outreach");

  const [campaigns, contacts] = await Promise.all([
    prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.mediaContact.findMany({
      where: { organizationId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Neue Outreach" />
      {campaigns.length === 0 || contacts.length === 0 ? (
        <EmptyState message="Bitte legen Sie zuerst eine Kampagne und einen Medienkontakt an." />
      ) : (
        <OutreachForm
          action={createOutreachAction}
          campaigns={campaigns}
          contacts={contacts}
          submitLabel="Anlegen"
        />
      )}
    </div>
  );
}
