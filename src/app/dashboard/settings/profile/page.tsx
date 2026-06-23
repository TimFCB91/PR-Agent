import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { PageHeader, LinkButton } from "@/components/ui";
import { ProfileForm, OrganizationForm } from "./profile-forms";

export default async function ProfileSettingsPage() {
  const { userId, organizationId } = await requireTenant();

  const [user, org] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
  ]);
  if (!user || !org) notFound();

  return (
    <div>
      <PageHeader
        title="Profil & Organisation"
        description="Deinen Namen, deine Login-E-Mail und den Agentur-Namen ändern."
        action={
          <LinkButton href="/dashboard/settings" variant="secondary">
            Zurück zu Einstellungen
          </LinkButton>
        }
      />
      <ProfileForm defaults={{ name: user.name, email: user.email }} />
      <OrganizationForm defaults={{ name: org.name }} />
    </div>
  );
}
