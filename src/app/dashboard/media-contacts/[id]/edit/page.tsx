import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { updateMediaContactAction } from "@/actions/media-contacts";
import { PageHeader } from "@/components/ui";
import { MediaContactForm } from "../../media-contact-form";

export default async function EditMediaContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/media-contacts");

  const contact = await prisma.mediaContact.findFirst({
    where: { id, organizationId },
  });
  if (!contact) notFound();

  const action = updateMediaContactAction.bind(null, contact.id);

  return (
    <div>
      <PageHeader title="Medienkontakt bearbeiten" />
      <MediaContactForm
        action={action}
        defaults={contact}
        submitLabel="Speichern"
      />
    </div>
  );
}
