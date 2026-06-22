import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding demo data…");

  // Clean slate (cascades remove all tenant-owned rows).
  await prisma.organization.deleteMany();

  const passwordHash = await hash(DEMO_PASSWORD);

  // --------------------------------------------------------------------------
  // Organization 1 — Acme PR (fictional)
  // --------------------------------------------------------------------------
  const acme = await prisma.organization.create({
    data: {
      name: "Acme PR",
      slug: "acme-pr",
      users: {
        create: [
          {
            name: "Alex Owner",
            email: "owner@acme.test",
            passwordHash,
            role: "OWNER",
          },
          {
            name: "Adina Admin",
            email: "admin@acme.test",
            passwordHash,
            role: "ADMIN",
          },
          {
            name: "Ed Editor",
            email: "editor@acme.test",
            passwordHash,
            role: "EDITOR",
          },
          {
            name: "Vera Viewer",
            email: "viewer@acme.test",
            passwordHash,
            role: "VIEWER",
          },
        ],
      },
    },
  });

  const acmeClientA = await prisma.client.create({
    data: {
      organizationId: acme.id,
      name: "Nordwind Mobility",
      contactEmail: "presse@nordwind.test",
      contactPhone: "+49 30 0000001",
      website: "https://nordwind.test",
      notes: "Fiktiver Kunde – E-Mobilität.",
    },
  });

  const acmeClientB = await prisma.client.create({
    data: {
      organizationId: acme.id,
      name: "Helios Food Labs",
      contactEmail: "media@helios.test",
      website: "https://helios.test",
      notes: "Fiktiver Kunde – Lebensmittel-Startup.",
    },
  });

  const acmeCampaign = await prisma.campaign.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      name: "Produktlaunch E-Bike 2026",
      description: "Markteinführung des neuen City-E-Bikes.",
      status: "ACTIVE",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-30"),
    },
  });

  await prisma.campaign.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientB.id,
      name: "Nachhaltigkeits-Story Q2",
      description: "Pflanzliche Proteine in der Presse platzieren.",
      status: "DRAFT",
    },
  });

  const acmeContacts = await Promise.all(
    [
      {
        firstName: "Lena",
        lastName: "Musterfrau",
        email: "lena.musterfrau@beispiel-magazin.test",
        outlet: "Beispiel Magazin",
        beat: "Mobilität",
      },
      {
        firstName: "Tom",
        lastName: "Beispiel",
        email: "tom.beispiel@demo-zeitung.test",
        outlet: "Demo Zeitung",
        beat: "Wirtschaft",
      },
      {
        firstName: "Sara",
        lastName: "Platzhalter",
        email: "sara.platzhalter@test-blog.test",
        outlet: "Test Blog",
        beat: "Technologie",
      },
    ].map((c) =>
      prisma.mediaContact.create({
        data: { ...c, organizationId: acme.id },
      }),
    ),
  );

  await prisma.outreach.create({
    data: {
      organizationId: acme.id,
      campaignId: acmeCampaign.id,
      mediaContactId: acmeContacts[0].id,
      subject: "Exklusiv: Neues City-E-Bike",
      message: "Hallo Lena, gerne bieten wir Ihnen einen Vorab-Test an.",
      status: "SENT",
      sentAt: new Date("2026-03-05"),
    },
  });

  await prisma.outreach.create({
    data: {
      organizationId: acme.id,
      campaignId: acmeCampaign.id,
      mediaContactId: acmeContacts[1].id,
      subject: "Interviewangebot Geschäftsführung",
      status: "PLANNED",
    },
  });

  // --------------------------------------------------------------------------
  // Organization 2 — Globe Comms (fictional, isolated tenant)
  // --------------------------------------------------------------------------
  const globe = await prisma.organization.create({
    data: {
      name: "Globe Comms",
      slug: "globe-comms",
      users: {
        create: [
          {
            name: "Greta Owner",
            email: "owner@globe.test",
            passwordHash,
            role: "OWNER",
          },
        ],
      },
    },
  });

  const globeClient = await prisma.client.create({
    data: {
      organizationId: globe.id,
      name: "Polaris Software",
      contactEmail: "press@polaris.test",
      notes: "Fiktiver Kunde – B2B SaaS.",
    },
  });

  const globeCampaign = await prisma.campaign.create({
    data: {
      organizationId: globe.id,
      clientId: globeClient.id,
      name: "Series-A Announcement",
      status: "ACTIVE",
    },
  });

  const globeContact = await prisma.mediaContact.create({
    data: {
      organizationId: globe.id,
      firstName: "Max",
      lastName: "Demo",
      email: "max.demo@fiktiv-news.test",
      outlet: "Fiktiv News",
      beat: "Tech & Startups",
    },
  });

  await prisma.outreach.create({
    data: {
      organizationId: globe.id,
      campaignId: globeCampaign.id,
      mediaContactId: globeContact.id,
      subject: "Finanzierungsrunde Polaris Software",
      status: "REPLIED",
      sentAt: new Date("2026-05-10"),
    },
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Demo-Logins (Passwort für alle: " + DEMO_PASSWORD + ")");
  console.log("  Acme PR:     owner@acme.test / admin@acme.test / editor@acme.test / viewer@acme.test");
  console.log("  Globe Comms: owner@globe.test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
