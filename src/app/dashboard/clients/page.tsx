import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteClientAction } from "@/actions/clients";
import { DeleteButton } from "@/components/delete-button";
import {
  Card,
  PageHeader,
  LinkButton,
  EmptyState,
  Badge,
  Input,
  Button,
} from "@/components/ui";
import { ClientsImportForm } from "./clients-import-form";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  ENDED: "Beendet",
};

function fmtDate(value?: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const [all, placements] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId, isTopicPool: false },
      orderBy: [{ name: "asc" }],
      include: { _count: { select: { campaigns: true } } },
    }),
    prisma.placement.findMany({
      where: { organizationId },
      select: { clientId: true, state: true },
    }),
  ]);

  // Placements per client: total slots vs. already published.
  const placeStats = new Map<string, { total: number; published: number }>();
  for (const p of placements) {
    const s = placeStats.get(p.clientId) ?? { total: 0, published: 0 };
    s.total++;
    if (p.state === "PUBLISHED") s.published++;
    placeStats.set(p.clientId, s);
  }

  const total = all.length;
  const activeCount = all.filter((c) => c.status === "ACTIVE").length;

  const filtered = query
    ? all.filter((c) => c.name.toLowerCase().includes(query))
    : all;

  // Group by responsible person; "Ohne Zuständige:r" goes last.
  const groups = new Map<string, typeof filtered>();
  for (const c of filtered) {
    const key = c.responsiblePerson?.trim() || "— ohne Zuständige:r —";
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const aNo = a[0].startsWith("—");
    const bNo = b[0].startsWith("—");
    if (aNo !== bNo) return aNo ? 1 : -1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <div>
      <PageHeader
        title="Kunden"
        description={`${total} Kunden insgesamt · ${activeCount} aktiv`}
        action={
          writable && (
            <LinkButton href="/dashboard/clients/new">Neuer Kunde</LinkButton>
          )
        }
      />

      {writable && (
        <div className="mb-6">
          <ClientsImportForm />
        </div>
      )}

      {/* Search */}
      <form method="get" className="mb-6 flex max-w-md gap-2">
        <Input
          name="q"
          placeholder="Kunden suchen…"
          defaultValue={q ?? ""}
        />
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
        {query && (
          <LinkButton href="/dashboard/clients" variant="secondary">
            ×
          </LinkButton>
        )}
      </form>

      {total === 0 ? (
        <EmptyState message="Noch keine Kunden angelegt." />
      ) : filtered.length === 0 ? (
        <EmptyState message={`Keine Treffer für „${q}".`} />
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([resp, list]) => (
            <div key={resp}>
              <h2 className="mb-2 text-sm font-semibold text-gray-900">
                👤 {resp}{" "}
                <span className="font-normal text-gray-400">
                  ({list.length})
                </span>
              </h2>
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Stufe</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Paket</th>
                      <th className="px-5 py-3 font-medium">Onboarding</th>
                      <th className="px-5 py-3 font-medium">Platzierungen</th>
                      <th className="px-5 py-3 font-medium">Kampagnen</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((client) => {
                      const tip = [
                        client.package && `Paket: ${client.package}`,
                        client.responsiblePerson &&
                          `Zuständig: ${client.responsiblePerson}`,
                        client.onboardingDate &&
                          `Onboarding: ${fmtDate(client.onboardingDate)}`,
                        client.tier && `Stufe: ${client.tier}`,
                        `Status: ${STATUS_LABEL[client.status] ?? client.status}`,
                        client.notes && `Notiz: ${client.notes}`,
                      ]
                        .filter(Boolean)
                        .join("\n");
                      return (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className="hover:underline"
                              title={tip}
                            >
                              {client.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {client.tier ? <Badge value={client.tier} /> : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <Badge
                              value={STATUS_LABEL[client.status] ?? client.status}
                            />
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {client.package ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {fmtDate(client.onboardingDate)}
                          </td>
                          <td className="px-5 py-3">
                            {(() => {
                              const s = placeStats.get(client.id);
                              const total = Math.max(
                                client.placementGoal ?? 0,
                                s?.total ?? 0,
                              );
                              if (total === 0)
                                return <span className="text-gray-400">—</span>;
                              const pub = s?.published ?? 0;
                              return (
                                <Link
                                  href={`/dashboard/clients/${client.id}?tab=placements`}
                                  className="font-medium text-blue-700 underline"
                                  title="Zur Platzierungs-Übersicht"
                                >
                                  {pub}/{total}
                                </Link>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {client._count.campaigns}
                          </td>
                          <td className="px-5 py-3">
                            {writable && (
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/dashboard/clients/${client.id}/edit`}
                                  className="text-xs font-medium text-gray-700 underline"
                                >
                                  Bearbeiten
                                </Link>
                                <DeleteButton
                                  id={client.id}
                                  action={deleteClientAction}
                                  confirmText="Kunden und zugehörige Kampagnen löschen?"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
