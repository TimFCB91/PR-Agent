import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteOutreachAction } from "@/actions/outreach";
import { DeleteButton } from "@/components/delete-button";
import {
  Card,
  PageHeader,
  LinkButton,
  EmptyState,
  Badge,
} from "@/components/ui";

export default async function OutreachPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const outreaches = await prisma.outreach.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { name: true } },
      mediaContact: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Ansprache von Medienkontakten je Kampagne"
        action={
          writable && (
            <LinkButton href="/dashboard/outreach/new">
              Neue Outreach
            </LinkButton>
          )
        }
      />

      {outreaches.length === 0 ? (
        <EmptyState message="Noch keine Outreach-Einträge angelegt." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Betreff</th>
                <th className="px-5 py-3 font-medium">Kampagne</th>
                <th className="px-5 py-3 font-medium">Kontakt</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {outreaches.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {o.subject}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{o.campaign.name}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {o.mediaContact.firstName} {o.mediaContact.lastName}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={o.status} />
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/outreach/${o.id}/edit`}
                          className="text-xs font-medium text-gray-700 underline"
                        >
                          Bearbeiten
                        </Link>
                        <DeleteButton
                          id={o.id}
                          action={deleteOutreachAction}
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
