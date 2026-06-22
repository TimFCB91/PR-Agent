import { redirect } from "next/navigation";

import { requireTenant, canWrite } from "@/lib/tenant";
import { createMediaContactAction } from "@/actions/media-contacts";
import { PageHeader } from "@/components/ui";
import { MediaContactForm } from "../media-contact-form";

export default async function NewMediaContactPage() {
  const { role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/media-contacts");

  return (
    <div>
      <PageHeader title="Neuer Medienkontakt" />
      <MediaContactForm
        action={createMediaContactAction}
        submitLabel="Anlegen"
      />
    </div>
  );
}
