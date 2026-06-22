import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, PageHeader, Badge } from "@/components/ui";

export default async function DashboardPage() {
  const { organizationId } = await requireTenant();

  const [clients, campaigns, mediaContacts, outreaches, recentOutreach] =
    await Promise.all([
      prisma.client.count({ where: { organizationId, isTopicPool: false } }),
      prisma.campaign.count({ where: { organizationId } }),
      prisma.mediaContact.count({ where: { organizationId } }),
      prisma.outreach.count({ where: { organizationId } }),
      prisma.outreach.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          campaign: { select: { name: true } },
          mediaContact: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

  const stats = [
    { label: "Kunden", value: clients },
    { label: "Kampagnen", value: campaigns },
    { label: "Medienkontakte", value: mediaContacts },
    { label: "Outreach", value: outreaches },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Überblick über Ihre PR-Aktivitäten"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        Letzte Outreach-Aktivitäten
      </h2>
      <Card>
        {recentOutreach.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Noch keine Outreach-Aktivitäten.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentOutreach.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {o.subject}
                  </p>
                  <p className="text-xs text-gray-500">
                    {o.campaign.name} ·{" "}
                    {o.mediaContact.firstName} {o.mediaContact.lastName}
                  </p>
                </div>
                <Badge value={o.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
