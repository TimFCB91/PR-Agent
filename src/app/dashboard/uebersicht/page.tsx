import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import {
  ACCEPTED_STATUSES,
  shouldFollowUp,
} from "@/lib/outreach/outreachManager";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";

const th =
  "px-4 py-3 font-medium text-xs uppercase tracking-wide text-gray-500 whitespace-nowrap";
const td = "px-4 py-3 text-gray-600 whitespace-nowrap";

function fmtDate(value?: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  ENDED: "Beendet",
};

export default async function UebersichtPage() {
  const { organizationId } = await requireTenant();

  const [clients, pubAgg, outreaches] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId, isTopicPool: false },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { _count: { select: { campaigns: true } } },
    }),
    // Publications per client: count + latest date (auto-derived).
    prisma.publication.groupBy({
      by: ["clientId"],
      where: { organizationId },
      _count: { _all: true },
      _max: { publicationDate: true },
    }),
    // Outreach (via campaign) → Zusagen + open follow-ups per client.
    prisma.outreach.findMany({
      where: { organizationId },
      select: {
        status: true,
        sentAt: true,
        nextFollowUpDate: true,
        responseReceivedAt: true,
        responseType: true,
        campaign: { select: { clientId: true } },
        mediaContact: { select: { doNotContact: true, relationship: true } },
      },
    }),
  ]);

  const pubByClient = new Map(
    pubAgg.map((p) => [
      p.clientId,
      { count: p._count._all, last: p._max.publicationDate },
    ]),
  );

  // Aggregate outreach signals per client.
  const zusagen = new Map<string, number>();
  const followUps = new Map<string, number>();
  for (const o of outreaches) {
    const cid = o.campaign.clientId;
    if (ACCEPTED_STATUSES.includes(o.status)) {
      zusagen.set(cid, (zusagen.get(cid) ?? 0) + 1);
    }
    if (
      shouldFollowUp({
        status: o.status,
        sentAt: o.sentAt,
        nextFollowUpDate: o.nextFollowUpDate,
        responseReceivedAt: o.responseReceivedAt,
        responseType: o.responseType,
        contactDoNotContact: o.mediaContact.doNotContact,
        contactRelationship: o.mediaContact.relationship,
      })
    ) {
      followUps.set(cid, (followUps.get(cid) ?? 0) + 1);
    }
  }

  const activeCount = clients.filter((c) => c.status === "ACTIVE").length;
  const totalZusagen = [...zusagen.values()].reduce((a, b) => a + b, 0);
  const totalPublished = pubAgg.reduce((a, p) => a + p._count._all, 0);

  return (
    <div>
      <PageHeader
        title="Kundenübersicht"
        description="Alle Kunden auf einen Blick – Paket, Zuständigkeit, Onboarding sowie Zusagen und Veröffentlichungen (automatisch aus Outreach & Veröffentlichungen)."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Kunden gesamt" value={clients.length} />
        <Kpi label="Davon aktiv" value={activeCount} />
        <Kpi label="Zusagen gesamt" value={totalZusagen} />
        <Kpi label="Veröffentlicht gesamt" value={totalPublished} />
      </div>

      {clients.length === 0 ? (
        <EmptyState message="Noch keine Kunden angelegt." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Kunde</th>
                <th className={th}>Stufe</th>
                <th className={th}>Status</th>
                <th className={th}>Paket</th>
                <th className={th}>Zuständig</th>
                <th className={th}>Onboarding</th>
                <th className={th}>Zusagen</th>
                <th className={th}>Veröffentlicht</th>
                <th className={th}>Letzte Veröff.</th>
                <th className={th}>Follow-ups offen</th>
                <th className={th}>Kampagnen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c) => {
                const z = zusagen.get(c.id) ?? 0;
                const goal = c.placementGoal ?? null;
                const pub = pubByClient.get(c.id);
                const open = followUps.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className={td}>{c.tier ? <Badge value={c.tier} /> : "—"}</td>
                    <td className={td}>
                      <Badge value={STATUS_LABEL[c.status] ?? c.status} />
                    </td>
                    <td className={td}>{c.package ?? "—"}</td>
                    <td className={td}>{c.responsiblePerson ?? "—"}</td>
                    <td className={td}>{fmtDate(c.onboardingDate)}</td>
                    <td className={td}>
                      <span className="font-medium text-gray-900">{z}</span>
                      {goal != null && (
                        <span className="text-gray-400"> / {goal}</span>
                      )}
                    </td>
                    <td className={td}>{pub?.count ?? 0}</td>
                    <td className={td}>{fmtDate(pub?.last)}</td>
                    <td className={td}>
                      {open > 0 ? (
                        <span className="font-medium text-amber-700">{open}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className={td}>{c._count.campaigns}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-4 text-xs text-gray-400">
        „Zusagen" = positive Outreach-Reaktionen (interessiert/zugesagt/geliefert/
        veröffentlicht). „Veröffentlicht" = erfasste Veröffentlichungen. Beide
        Werte aktualisieren sich automatisch, sobald du Outreach-Status und
        Veröffentlichungen pflegst – keine separate Liste mehr nötig.
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </Card>
  );
}
