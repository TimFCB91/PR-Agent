import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { getCampaignReport } from "@/lib/reporting";
import { toggleCampaignShareAction } from "@/actions/campaigns";
import { ActionButton } from "@/components/action-button";
import { Card, PageHeader, LinkButton } from "@/components/ui";

export default async function CampaignDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId },
    include: { client: { select: { name: true } } },
  });

  if (!campaign) notFound();

  const report = await getCampaignReport(campaign.id, organizationId);

  const stats = [
    { label: "Themen", value: report.topics },
    { label: "Pitches", value: report.pitches },
    { label: "Offene Follow-ups", value: report.openFollowUps },
    { label: "Zusagen", value: report.accepted },
    { label: "Absagen", value: report.declined },
    { label: "Veröffentlichte Beiträge", value: report.publications },
  ];

  const reportRows = [
    { label: "Kontaktiert", value: report.contacted },
    { label: "Offen", value: report.open },
    { label: "Zusagen", value: report.accepted },
    { label: "Absagen", value: report.declined },
    { label: "Veröffentlichungen", value: report.publications },
  ];

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={campaign.client.name}
        action={
          <div className="flex items-center gap-2">
            {writable && (
              <LinkButton href={`/dashboard/campaigns/${id}/edit`}>
                Bearbeiten
              </LinkButton>
            )}
            <LinkButton href="/dashboard/campaigns" variant="secondary">
              Zurück
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Campaign Report
      </h2>
      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {reportRows.map((row) => (
            <div key={row.label}>
              <dt className="text-sm text-gray-500">{row.label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Externer Report (Read-Only)
      </h2>
      <Card className="space-y-4 p-5">
        {writable &&
          (campaign.shareEnabled ? (
            <ActionButton
              action={toggleCampaignShareAction}
              fields={{ id: campaign.id, enable: "false" }}
              label="Freigabe deaktivieren"
            />
          ) : (
            <ActionButton
              action={toggleCampaignShareAction}
              fields={{ id: campaign.id, enable: "true" }}
              label="Externen Report freigeben"
              variant="primary"
            />
          ))}

        {campaign.shareEnabled && campaign.shareToken ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Dieser Report ist ohne Login über folgenden Link erreichbar:
            </p>
            <code className="block rounded bg-gray-100 px-3 py-2 text-sm text-gray-800">
              /report/{campaign.shareToken}
            </code>
            <LinkButton
              href={`/report/${campaign.shareToken}`}
              variant="secondary"
              prefetch={false}
            >
              Report öffnen
            </LinkButton>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Der externe Report ist derzeit nicht freigegeben.
          </p>
        )}

        <div>
          <LinkButton
            href="/api/export/publications"
            variant="secondary"
            prefetch={false}
          >
            Veröffentlichungen exportieren (CSV)
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
