import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { deleteOutreachAction, generatePitchAction } from "@/actions/outreach";
import { DeleteButton } from "@/components/delete-button";
import { ActionButton } from "@/components/action-button";
import { FollowUpControl } from "./follow-up-control";
import {
  statusLabel,
  effectiveWaitingOn,
  waitingOnLabel,
} from "@/lib/outreach/labels";
import { ACCEPTED_STATUSES } from "@/lib/outreach/outreachManager";
import { mailboxSearchUrl } from "@/lib/outreach/mail";
import {
  Card,
  PageHeader,
  LinkButton,
  EmptyState,
  Badge,
} from "@/components/ui";

export default async function OutreachPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const outreaches = await prisma.outreach.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { name: true } },
      mediaContact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Ansprache von Medienkontakten je Kampagne"
        action={
          <div className="flex gap-2">
            <LinkButton
              href="/api/export/outreach"
              variant="secondary"
              prefetch={false}
            >
              CSV-Export
            </LinkButton>
            {writable && (
              <LinkButton href="/dashboard/outreach/new">
                Neue Outreach
              </LinkButton>
            )}
          </div>
        }
      />

      {outreaches.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <PipeKpi
            label="Am Zug: Wir"
            value={
              outreaches.filter((o) => effectiveWaitingOn(o) === "AGENCY").length
            }
          />
          <PipeKpi
            label="Wartet auf Kunde"
            value={
              outreaches.filter((o) => effectiveWaitingOn(o) === "CLIENT").length
            }
          />
          <PipeKpi
            label="Wartet auf Medium"
            value={
              outreaches.filter((o) => effectiveWaitingOn(o) === "MEDIA").length
            }
          />
          <PipeKpi
            label="Zusagen"
            value={
              outreaches.filter((o) => ACCEPTED_STATUSES.includes(o.status))
                .length
            }
          />
          <PipeKpi
            label="Veröffentlicht"
            value={outreaches.filter((o) => o.status === "PUBLISHED").length}
          />
        </div>
      )}

      {outreaches.length === 0 ? (
        <EmptyState message="Noch keine Outreach-Einträge angelegt." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Betreff</th>
                <th className="px-5 py-3 font-medium">Kampagne</th>
                <th className="px-5 py-3 font-medium">Kontakt</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Am Zug</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {outreaches.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {o.subject}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{o.campaign.name}</td>
                  <td className="px-5 py-3 text-gray-600">
                    <div>
                      {o.mediaContact.firstName} {o.mediaContact.lastName}
                    </div>
                    {o.mediaContact.email && (
                      <div className="text-xs text-gray-400">
                        {o.mediaContact.email}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={statusLabel(o.status)} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {waitingOnLabel(effectiveWaitingOn(o))}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(() => {
                        const search = mailboxSearchUrl({
                          email: o.mediaContact.email,
                          subject: o.subject,
                          channel: o.channel,
                        });
                        return search ? (
                          <a
                            href={search}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-blue-700 underline"
                            title="Mails mit diesem Kontakt im Postfach suchen"
                          >
                            ✉️ Postfach
                          </a>
                        ) : null;
                      })()}
                      {o.threadUrl && (
                        <a
                          href={o.threadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-blue-700 underline"
                          title="Direkt zum hinterlegten E-Mail-Verlauf"
                        >
                          🔗 Verlauf
                        </a>
                      )}
                      {writable && (
                        <>
                          <ActionButton
                            action={generatePitchAction}
                            fields={{ id: o.id }}
                            label="Pitch generieren"
                          />
                          <FollowUpControl outreachId={o.id} />
                          <Link
                            href={`/dashboard/outreach/${o.id}/edit`}
                            className="text-xs font-medium text-gray-700 underline"
                          >
                            Bearbeiten
                          </Link>
                          <DeleteButton
                            id={o.id}
                            action={deleteOutreachAction}
                          />
                        </>
                      )}
                    </div>
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

function PipeKpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </Card>
  );
}
