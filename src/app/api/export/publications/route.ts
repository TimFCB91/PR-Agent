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

  const publications = await prisma.publication.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      campaign: { select: { name: true } },
      mediaContact: { select: { firstName: true, lastName: true } },
    },
  });

  const rows: Array<Array<unknown>> = [
    ["title", "client", "campaign", "mediaContact", "url", "publicationDate", "notes"],
    ...publications.map((p) => [
      p.title,
      p.client.name,
      p.campaign?.name ?? "",
      p.mediaContact
        ? `${p.mediaContact.firstName} ${p.mediaContact.lastName}`
        : "",
      p.url,
      iso(p.publicationDate),
      p.notes,
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="publications.csv"',
    },
  });
}
