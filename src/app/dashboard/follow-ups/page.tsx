import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { shouldFollowUp } from "@/lib/outreach/outreachManager";
import { FollowUpControl } from "../outreach/follow-up-control";
import {
  Card,
  PageHeader,
  EmptyState,
  Badge,
} from "@/components/ui";

const PRIORITY_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

function fmtDate(value?: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

const th =
  "px-5 py-3 font-medium text-xs uppercase tracking-wide text-gray-500";
const td = "px-5 py-3 text-gray-600";

export default async function FollowUpsPage() {
  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  // Only contacts that already received a first mail are candidates.
  const candidates = await prisma.outreach.findMany({
    where: {
      organizationId,
      status: { in: ["SENT", "FOLLOW_UP_DUE"] },
    },
    include: {
      mediaContact: {
        select: {
          firstName: true,
          lastName: true,
          outlet: true,
          priority: true,
          relationship: true,
          doNotContact: true,
        },
      },
      campaign: {
        select: { name: true, client: { select: { name: true } } },
      },
    },
    orderBy: { nextFollowUpDate: "asc" },
  });

  // Apply the agency plan's follow-up rules (open, no response, due, not
  // protected) and sort by A/B/C priority, then by due date.
  const due = candidates
    .filter((o) =>
      shouldFollowUp({
        status: o.status,
        sentAt: o.sentAt,
        nextFollowUpDate: o.nextFollowUpDate,
        responseReceivedAt: o.responseReceivedAt,
        responseType: o.responseType,
        contactDoNotContact: o.mediaContact.doNotContact,
        contactRelationship: o.mediaContact.relationship,
      }),
    )
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.mediaContact.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.mediaContact.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      const da = a.nextFollowUpDate?.getTime() ?? 0;
      const db = b.nextFollowUpDate?.getTime() ?? 0;
      return da - db;
    });

  return (
    <div>
      <PageHeader
        title="Fällige Follow-ups"
        description="Kontakte, bei denen jetzt nachgefasst werden sollte — automatisch aus Versanddatum und Reaktionen berechnet."
      />

      {due.length === 0 ? (
        <EmptyState message="Aktuell sind keine Follow-ups fällig. 🎉" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Prio</th>
                <th className={th}>Kontakt</th>
                <th className={th}>Medium</th>
                <th className={th}>Kunde / Kampagne</th>
                <th className={th}>Erstmail</th>
                <th className={th}>Fällig am</th>
                <th className={th}>Nächster Schritt</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {due.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className={td}>
                    <Badge value={o.mediaContact.priority} />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {o.mediaContact.firstName} {o.mediaContact.lastName}
                    {o.mediaContact.relationship === "GOLD" && (
                      <span className="ml-2 text-xs text-amber-600">★ Gold</span>
                    )}
                  </td>
                  <td className={td}>{o.mediaContact.outlet ?? "—"}</td>
                  <td className={td}>
                    {o.campaign.client.name}
                    <span className="text-gray-400"> · {o.campaign.name}</span>
                  </td>
                  <td className={td}>{fmtDate(o.sentAt)}</td>
                  <td className={td}>{fmtDate(o.nextFollowUpDate)}</td>
                  <td className={td}>{o.nextStep ?? "—"}</td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <FollowUpControl outreachId={o.id} />
                        <Link
                          href={`/dashboard/outreach/${o.id}/edit`}
                          className="text-xs font-medium text-gray-700 underline"
                        >
                          Bearbeiten
                        </Link>
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
