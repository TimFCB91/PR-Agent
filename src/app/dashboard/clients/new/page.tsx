import { requireTenant, canWrite } from "@/lib/tenant";
import { redirect } from "next/navigation";

import { createClientAction } from "@/actions/clients";
import { PageHeader } from "@/components/ui";
import { ClientForm } from "../client-form";

export default async function NewClientPage() {
  const { role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/clients");

  return (
    <div>
      <PageHeader title="Neuer Kunde" />
      <ClientForm action={createClientAction} submitLabel="Anlegen" />
    </div>
  );
}
