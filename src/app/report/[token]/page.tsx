import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCampaignReport } from "@/lib/reporting";
import { getCampaignMediaIntelligence } from "@/lib/media/mediaIntelligence";
import { Card } from "@/components/ui";

export const metadata = { title: "Kampagnen-Report" };
export const dynamic = "force-dynamic";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { shareToken: token, shareEnabled: true },
    include: { client: { select: { name: true } } },
  });

  if (!campaign) notFound();

  const report = await getCampaignReport(campaign.id, campaign.organizationId);
  const mi = await getCampaignMediaIntelligence(
    campaign.id,
    campaign.organizationId,
  );

  const publications = await prisma.publication.findMany({
    where: { campaignId: campaign.id, organizationId: campaign.organizationId },
    include: {
      mediaContact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { publicationDate: "desc" },
  });

  const stats = [
    { label: "Kontaktiert", value: report.contacted },
    { label: "Offen", value: report.open },
    { label: "Zusagen", value: report.accepted },
    { label: "Absagen", value: report.declined },
    { label: "Veröffentlichungen", value: report.publications },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          Read-Only Report
        </span>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">
          {campaign.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{campaign.client.name}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
        Media Intelligence
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Kontaktiert", value: mi.contacted },
          { label: "Geantwortet", value: mi.responded },
          { label: "Zugesagt", value: mi.accepted },
          { label: "Veröffentlicht", value: mi.published },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Erfolgreichste Themen
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
        </Card>

        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Erfolgreichste Medien
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
        </Card>

        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Erfolgreichste Winkel
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
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Veröffentlichungen
      </h2>
      <Card className="overflow-hidden">
        {publications.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Noch keine Veröffentlichungen.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Titel</th>
                <th className="px-5 py-3 font-medium">Datum</th>
                <th className="px-5 py-3 font-medium">Kontakt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {publications.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {p.title}
                      </a>
                    ) : (
                      p.title
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.publicationDate
                      ? new Date(p.publicationDate).toLocaleDateString("de-DE")
                      : "–"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.mediaContact
                      ? `${p.mediaContact.firstName} ${p.mediaContact.lastName}`
                      : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <footer className="mt-10 text-center text-xs text-gray-400">
        Erstellt mit PR-Agent
      </footer>
    </div>
  );
}
