import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { getCampaignReport } from "@/lib/reporting";
import {
  getCampaignMediaIntelligence,
  getOrgMediaIntelligenceSummary,
} from "@/lib/media/mediaIntelligence";
import { toggleCampaignShareAction } from "@/actions/campaigns";
import {
  researchMediaAction,
  approveResearchResultAction,
  rejectResearchResultAction,
} from "@/actions/media-research";
import { ActionButton } from "@/components/action-button";
import { Card, PageHeader, LinkButton, EmptyState, Badge } from "@/components/ui";

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
  const mi = await getCampaignMediaIntelligence(campaign.id, organizationId);
  const summary = await getOrgMediaIntelligenceSummary(organizationId);

  const research = await prisma.mediaResearchResult.findMany({
    where: {
      campaignId: campaign.id,
      organizationId,
      status: { in: ["SUGGESTED", "REVIEWED", "DUPLICATE"] },
    },
    orderBy: { confidence: "desc" },
  });

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
        Media Intelligence
      </h2>
      <Card className="space-y-6 p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-gray-500">Kontaktiert</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {mi.contacted}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Geantwortet</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {mi.responded}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({mi.replyRate}%)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Zusagen</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {mi.accepted}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({mi.acceptanceRate}%)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Veröffentlicht</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {mi.published}{" "}
              <span className="text-sm font-normal text-gray-500">
                ({mi.publicationRate}%)
              </span>
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Top Medien
            </h3>
            {mi.topMedia.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {mi.topMedia.map((m) => (
                  <li key={m.outlet}>
                    {m.outlet} — {m.accepted} Zusagen
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Häufigste Ablehnungsgründe
            </h3>
            {mi.rejectionReasons.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {mi.rejectionReasons.map((r) => (
                  <li key={r.reason}>
                    {r.reason} — {r.count}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Top Themen
            </h3>
            {mi.topTopics.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {mi.topTopics.map((t) => (
                  <li key={t.key}>
                    {t.key} — {t.rate}% ({t.attempts})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Top Winkel
            </h3>
            {mi.topAngles.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {mi.topAngles.map((a) => (
                  <li key={a.key}>
                    {a.key} — {a.rate}% ({a.attempts})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {summary.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Muster (organisationsweit)
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
              {summary.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Passende Medien recherchieren
      </h2>
      <Card className="space-y-4 p-5">
        {writable && (
          <div className="space-y-2">
            <ActionButton
              action={researchMediaAction}
              fields={{ campaignId: campaign.id }}
              label="Passende Medien recherchieren"
              variant="primary"
            />
            <p className="text-xs text-gray-500">
              Vorschläge auf Basis öffentlicher Quellen. Werden nie automatisch
              übernommen — manuelle Freigabe nötig.
            </p>
          </div>
        )}

        {research.length === 0 ? (
          <EmptyState message="Noch keine recherchierten Vorschläge." />
        ) : (
          <div className="space-y-3">
            {research.map((r) => (
              <div key={r.id} className="rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {r.mediumName}
                  </span>
                  <Badge value={r.status} />
                  <span className="text-xs text-gray-500">
                    Confidence {r.confidence}%
                  </span>
                </div>

                <dl className="mt-2 space-y-1 text-sm text-gray-700">
                  <div>
                    <span className="text-gray-500">Medientyp:</span>{" "}
                    {r.mediaType ?? "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">Ressort:</span>{" "}
                    {r.section ?? "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">Region:</span>{" "}
                    {r.region ?? "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">Relevanz:</span>{" "}
                    {r.relevanceReason ?? "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">
                      Vorgeschlagener Winkel:
                    </span>{" "}
                    {r.suggestedAngle ?? "—"}
                  </div>
                  {r.contactName && (
                    <div>
                      <span className="text-gray-500">Kontakt:</span>{" "}
                      {r.contactName}
                      {r.contactRole ? ` (${r.contactRole})` : ""}
                    </div>
                  )}
                  {r.email && (
                    <div>
                      <span className="text-gray-500">E-Mail:</span> {r.email}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Quellen:</span>{" "}
                    {r.sourceUrls.length > 0 ? (
                      <span className="inline-flex flex-wrap gap-2">
                        {r.sourceUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {url}
                          </a>
                        ))}
                      </span>
                    ) : (
                      "Keine Quelle hinterlegt — vor Übernahme prüfen."
                    )}
                  </div>
                </dl>

                {writable &&
                  (r.status === "SUGGESTED" || r.status === "REVIEWED") && (
                    <div className="mt-3 flex items-center gap-2">
                      <ActionButton
                        action={approveResearchResultAction}
                        fields={{ id: r.id }}
                        label="Übernehmen"
                        variant="primary"
                      />
                      <ActionButton
                        action={rejectResearchResultAction}
                        fields={{ id: r.id }}
                        label="Ablehnen"
                        variant="danger"
                        confirmText="Vorschlag ablehnen?"
                      />
                    </div>
                  )}

                {r.status === "DUPLICATE" && (
                  <p className="mt-3 text-xs text-gray-500">
                    Bereits als Kontakt vorhanden.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
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
