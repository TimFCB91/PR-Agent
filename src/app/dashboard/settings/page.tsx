import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, PageHeader, Badge, LinkButton } from "@/components/ui";

export default async function SettingsPage() {
  const { organizationId } = await requireTenant();

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Einstellungen"
        description="Organisation und Teammitglieder"
      />

      <Card className="mb-6 p-6">
        <h2 className="text-sm font-semibold text-gray-900">Organisation</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium text-gray-900">{organization?.name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Slug</dt>
            <dd className="font-medium text-gray-900">{organization?.slug}</dd>
          </div>
        </dl>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Teammitglieder
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">E-Mail</th>
              <th className="px-5 py-3 font-medium">Rolle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {organization?.users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3 font-medium text-gray-900">
                  {u.name}
                </td>
                <td className="px-5 py-3 text-gray-600">{u.email}</td>
                <td className="px-5 py-3">
                  <Badge value={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-sm font-semibold text-gray-900">Schreibregeln</h2>
        <p className="mt-1 text-sm text-gray-500">
          Regelwerke für die spätere Artikel-Erstellung
        </p>
        <div className="mt-4">
          <LinkButton href="/dashboard/settings/writing-rules">
            Schreibregeln verwalten
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
