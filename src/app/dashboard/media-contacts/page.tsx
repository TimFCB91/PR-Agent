import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteMediaContactAction } from "@/actions/media-contacts";
import { DeleteButton } from "@/components/delete-button";
import { Card, PageHeader, LinkButton, EmptyState } from "@/components/ui";
import { ImportForm } from "./import-form";

export default async function MediaContactsPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const contacts = await prisma.mediaContact.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Medienkontakte"
        description="Journalist:innen und Redaktionen"
        action={
          writable && (
            <LinkButton href="/dashboard/media-contacts/new">
              Neuer Kontakt
            </LinkButton>
          )
        }
      />

      {writable && (
        <div className="mb-6">
          <ImportForm />
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyState message="Noch keine Medienkontakte angelegt." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">E-Mail</th>
                <th className="px-5 py-3 font-medium">Medium</th>
                <th className="px-5 py-3 font-medium">Ressort</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.email}</td>
                  <td className="px-5 py-3 text-gray-600">{c.outlet ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{c.beat ?? "—"}</td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/media-contacts/${c.id}/edit`}
                          className="text-xs font-medium text-gray-700 underline"
                        >
                          Bearbeiten
                        </Link>
                        <DeleteButton
                          id={c.id}
                          action={deleteMediaContactAction}
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
