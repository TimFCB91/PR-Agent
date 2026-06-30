import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contacts = await prisma.mediaContact.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { lastName: "asc" },
  });

  const rows: Array<Array<unknown>> = [
    ["firstName", "lastName", "email", "phone", "outlet", "beat", "notes"],
    ...contacts.map((c) => [
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.outlet,
      c.beat,
      c.notes,
    ]),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="media-contacts.csv"',
    },
  });
}
