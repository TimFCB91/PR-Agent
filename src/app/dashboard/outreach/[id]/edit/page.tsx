import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { updateOutreachAction } from "@/actions/outreach";
import { PageHeader } from "@/components/ui";
import { QualityPanel } from "@/components/quality-panel";
import { KnowledgeSources } from "@/components/knowledge-sources";
import { OutreachForm } from "../../outreach-form";

export default async function EditOutreachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/outreach");
  const writable = canWrite(role);

  const [outreach, campaigns, contacts] = await Promise.all([
    prisma.outreach.findFirst({
      where: { id, organizationId },
      include: { campaign: { select: { clientId: true } } },
    }),
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
  if (!outreach) notFound();

  const action = updateOutreachAction.bind(null, outreach.id);

  return (
    <div>
      <PageHeader title="Outreach bearbeiten" />
      <OutreachForm
        action={action}
        campaigns={campaigns}
        contacts={contacts}
        defaults={outreach}
        submitLabel="Speichern"
      />
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Qualitätsprüfung</h2>
        <div>
          <p className="text-sm font-medium text-gray-700">Pitch-Mail</p>
          <QualityPanel entityType="PITCH" entityId={outreach.id} clientId={outreach.campaign.clientId} organizationId={organizationId} writable={writable} />
          <KnowledgeSources entityType="PITCH" entityId={outreach.id} organizationId={organizationId} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Follow-up</p>
          <QualityPanel entityType="FOLLOW_UP" entityId={outreach.id} clientId={outreach.campaign.clientId} organizationId={organizationId} writable={writable} />
          <KnowledgeSources entityType="FOLLOW_UP" entityId={outreach.id} organizationId={organizationId} />
        </div>
      </div>
    </div>
  );
}
