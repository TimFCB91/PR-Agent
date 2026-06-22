import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { signOutAction } from "@/actions/sign-out";
import { Sidebar } from "@/components/sidebar";
import { Badge, Button } from "@/components/ui";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireTenant();
  const [organization, user] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenant.organizationId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: tenant.userId },
      select: { name: true, email: true },
    }),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <p className="text-lg font-bold text-gray-900">PR-Agent</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {organization?.name}
          </p>
        </div>
        <div className="flex-1 px-3 py-4">
          <Sidebar />
        </div>
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="mb-3">
            <p className="truncate text-sm font-medium text-gray-900">
              {user?.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge value={tenant.role} />
            </div>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" className="w-full">
              Abmelden
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
