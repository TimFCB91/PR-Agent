import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

function iso(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const outreaches = await prisma.outreach.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { name: true } },
      mediaContact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const rows: Array<Array<unknown>> = [
    [
      "subject",
      "status",
      "campaign",
      "contactName",
      "contactEmail",
      "sentAt",
      "lastContactDate",
      "nextFollowUpDate",
      "agreedTopic",
      "publicationUrl",
    ],
    ...outreaches.map((o) => [
      o.subject,
      o.status,
      o.campaign.name,
      `${o.mediaContact.firstName} ${o.mediaContact.lastName}`,
      o.mediaContact.email,
      iso(o.sentAt),
      iso(o.lastContactDate),
      iso(o.nextFollowUpDate),
      o.agreedTopic,
      o.publicationUrl,
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="outreach.csv"',
    },
  });
}
