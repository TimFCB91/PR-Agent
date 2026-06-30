import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteClientAction } from "@/actions/clients";
import { DeleteButton } from "@/components/delete-button";
import { Card, PageHeader, LinkButton, EmptyState } from "@/components/ui";
import { ClientsImportForm } from "./clients-import-form";

export default async function ClientsPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const clients = await prisma.client.findMany({
    where: { organizationId, isTopicPool: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { campaigns: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Kunden"
        description="Verwalten Sie Ihre Auftraggeber"
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

      {clients.length === 0 ? (
        <EmptyState message="Noch keine Kunden angelegt." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">E-Mail</th>
                <th className="px-5 py-3 font-medium">Kampagnen</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {client.contactEmail ?? "—"}
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
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
