import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { recomputeContactAction } from "@/actions/media";
import { ActionButton } from "@/components/action-button";
import { Card, Badge, PageHeader, LinkButton, EmptyState } from "@/components/ui";

export default async function MediaContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const contact = await prisma.mediaContact.findFirst({
    where: { id, organizationId },
    include: {
      performance: true,
      preference: true,
      outreaches: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { campaign: { select: { name: true } } },
      },
      publications: { orderBy: { publicationDate: "desc" }, take: 10 },
    },
  });

  if (!contact) notFound();

  const performance = contact.performance;
  const preference = contact.preference;

  const stats = [
    { label: "Antwortquote", value: `${performance?.replyRate ?? 0}%` },
    { label: "Zusagequote", value: `${performance?.acceptanceRate ?? 0}%` },
    {
      label: "Veröffentlichungsquote",
      value: `${performance?.publicationRate ?? 0}%`,
    },
    {
      label: "Ø Antwortzeit",
      value: `${performance?.averageResponseTimeHours ?? "—"} h`,
    },
  ];

  const fmtList = (value: string[] | null | undefined) =>
    value && value.length > 0 ? value.join(", ") : "—";

  return (
    <div>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={contact.outlet ?? undefined}
        action={
          <div className="flex items-center gap-2">
            {writable && (
              <ActionButton
                action={recomputeContactAction}
                fields={{ id: contact.id }}
                label="Neu berechnen"
                variant="secondary"
              />
            )}
            <LinkButton href="/dashboard/media-contacts" variant="secondary">
              Zurück
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Pitches: {performance?.totalPitches ?? 0} · Replies:{" "}
        {performance?.totalReplies ?? 0} · Zusagen:{" "}
        {performance?.totalAcceptances ?? 0} · Veröffentlichungen:{" "}
        {performance?.totalPublications ?? 0}
      </p>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Bevorzugte Themen &amp; Formate
      </h2>
      <Card className="space-y-2 p-5 text-sm">
        <p>
          <span className="text-gray-500">Bevorzugte Themen: </span>
          {fmtList(preference?.preferredTopics)}
        </p>
        <p>
          <span className="text-gray-500">Bevorzugte Winkel: </span>
          {fmtList(preference?.preferredAngles)}
        </p>
        <p>
          <span className="text-gray-500">Vermiedene Themen: </span>
          {fmtList(preference?.avoidedTopics)}
        </p>
        <p>
          <span className="text-gray-500">Bevorzugte Formate: </span>
          {fmtList(preference?.preferredFormats)}
        </p>
        <p>
          <span className="text-gray-500">Konfidenz: </span>
          {preference?.confidence ?? 0}%
        </p>
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Letzte Kontakte
      </h2>
      {contact.outreaches.length === 0 ? (
        <EmptyState message="Noch keine Kontakte." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Betreff</th>
                <th className="px-5 py-3 font-medium">Kampagne</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Reaktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contact.outreaches.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {o.subject}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{o.campaign.name}</td>
                  <td className="px-5 py-3">
                    <Badge value={o.status} />
                  </td>
                  <td className="px-5 py-3">
                    {o.responseType ? <Badge value={o.responseType} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">
        Veröffentlichungen
      </h2>
      {contact.publications.length === 0 ? (
        <EmptyState message="Noch keine Veröffentlichungen." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Titel</th>
                <th className="px-5 py-3 font-medium">Thema</th>
                <th className="px-5 py-3 font-medium">Winkel</th>
                <th className="px-5 py-3 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contact.publications.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {p.title}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.resultingTopic ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.resultingAngle ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.publicationDate?.toLocaleDateString("de-DE") ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
