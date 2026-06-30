import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { findTopicPool } from "@/lib/topics/topicPool";
import { loadClientProfiles } from "@/lib/matching/clientProfiles";
import { matchClientsToTopic } from "@/lib/matching/topicClientMatcher";
import { deletePoolTopicAction } from "@/actions/topic-pool";
import { DeleteButton } from "@/components/delete-button";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import { TrelloImportForm } from "./trello-import-form";

const th =
  "px-5 py-3 font-medium text-xs uppercase tracking-wide text-gray-500";
const td = "px-5 py-3 text-gray-600 align-top";

export default async function ThemenpoolPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const pool = await findTopicPool(organizationId);

  const [topics, profiles] = await Promise.all([
    pool
      ? prisma.topicIdea.findMany({
          where: { clientId: pool.id, organizationId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    loadClientProfiles(organizationId),
  ]);

  return (
    <div>
      <PageHeader
        title="Themenpool"
        description="Zentrale Themen-Pipeline (z. B. aus Trello). Je Thema siehst du, welche Kunden am besten passen."
      />

      {writable && (
        <div className="mb-6">
          <TrelloImportForm />
        </div>
      )}

      {topics.length === 0 ? (
        <EmptyState message="Noch keine Pool-Themen. Lade oben ein Trello-Board (JSON) hoch." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Thema</th>
                <th className={th}>Passende Kunden</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topics.map((t) => {
                const text = [t.title, t.description].filter(Boolean).join(" ");
                const matches = matchClientsToTopic(text, profiles, 4).filter(
                  (m) => m.score > 0,
                );
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 align-top">
                      <p className="font-medium text-gray-900">{t.title}</p>
                      {t.description && (
                        <p className="mt-1 max-w-md whitespace-pre-wrap text-xs text-gray-500">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className={td}>
                      {matches.length === 0 ? (
                        <span className="text-gray-400">
                          Keine klare Übereinstimmung
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {matches.map((m) => (
                            <div
                              key={m.clientId}
                              className="flex items-center gap-2"
                            >
                              <Badge value={`${m.score}%`} />
                              <Link
                                href={`/dashboard/clients/${m.clientId}`}
                                className="font-medium text-gray-800 hover:underline"
                              >
                                {m.clientName}
                              </Link>
                              {m.matchedTerms.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  ({m.matchedTerms.slice(0, 4).join(", ")})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      {writable && (
                        <div className="flex justify-end">
                          <DeleteButton
                            id={t.id}
                            action={deletePoolTopicAction}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
