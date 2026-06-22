import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { updateClientAction } from "@/actions/clients";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../../client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/clients");

  // Scope the lookup by organizationId so a foreign id resolves to 404.
  const client = await prisma.client.findFirst({
    where: { id, organizationId },
  });
  if (!client) notFound();

  const action = updateClientAction.bind(null, client.id);

  return (
    <div>
      <PageHeader title="Kunde bearbeiten" />
      <ClientForm action={action} defaults={client} submitLabel="Speichern" />
    </div>
  );
}
