import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteWritingRuleSetAction } from "@/actions/writing-rules";
import { DeleteButton } from "@/components/delete-button";
import { Card, PageHeader, LinkButton, EmptyState } from "@/components/ui";

export default async function WritingRulesPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const ruleSets = await prisma.writingRuleSet.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Schreibregeln"
        description="Regelwerke für die spätere Artikel-Erstellung"
        action={
          <div className="flex gap-2">
            <LinkButton href="/dashboard/settings" variant="secondary">
              Zurück zu Einstellungen
            </LinkButton>
            {writable && (
              <LinkButton href="/dashboard/settings/writing-rules/new">
                Neues Regelwerk
              </LinkButton>
            )}
          </div>
        }
      />

      {ruleSets.length === 0 ? (
        <EmptyState message="Noch keine Schreibregeln angelegt." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Tonalität</th>
                <th className="px-5 py-3 font-medium">Wortzahl</th>
                <th className="px-5 py-3 font-medium">Verbotene Begriffe</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ruleSets.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {r.name}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {r.toneOfVoice ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {`${r.minWords ?? "—"}–${r.maxWords ?? "—"}`}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {r.forbiddenPhrases.length}
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/settings/writing-rules/${r.id}/edit`}
                          className="text-xs font-medium text-gray-700 underline"
                        >
                          Bearbeiten
                        </Link>
                        <DeleteButton
                          id={r.id}
                          action={deleteWritingRuleSetAction}
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
