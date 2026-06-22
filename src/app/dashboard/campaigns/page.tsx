import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteCampaignAction } from "@/actions/campaigns";
import { DeleteButton } from "@/components/delete-button";
import {
  Card,
  PageHeader,
  LinkButton,
  EmptyState,
  Badge,
} from "@/components/ui";

export default async function CampaignsPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      _count: { select: { outreaches: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Kampagnen"
        description="PR-Kampagnen Ihrer Kunden"
        action={
          writable && (
            <LinkButton href="/dashboard/campaigns/new">
              Neue Kampagne
            </LinkButton>
          )
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState message="Noch keine Kampagnen angelegt." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Kunde</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Outreach</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.client.name}</td>
                  <td className="px-5 py-3">
                    <Badge value={c.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {c._count.outreaches}
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/campaigns/${c.id}/edit`}
                          className="text-xs font-medium text-gray-700 underline"
                        >
                          Bearbeiten
                        </Link>
                        <DeleteButton
                          id={c.id}
                          action={deleteCampaignAction}
                          confirmText="Kampagne und zugehörige Outreach löschen?"
                        />
                      </div>
                    )}
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
