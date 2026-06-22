import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { chunkText } from "../src/lib/knowledge/chunker";
import { recomputeAllContacts } from "../src/lib/media/mediaIntelligence";

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

  const acmeOwner = await prisma.user.findFirstOrThrow({
    where: { organizationId: acme.id, role: "OWNER" },
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
      shareToken: "demo-report-token",
      shareEnabled: true,
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
      status: "INTERESTED",
      sentAt: new Date("2026-03-05"),
      lastContactDate: new Date("2026-03-12"),
      agreedTopic: "Vorab-Test City-E-Bike",
      responseReceivedAt: new Date("2026-03-07"),
      responseType: "INTERESTED",
      acceptedAngle: "Produkttest",
    },
  });

  await prisma.outreach.create({
    data: {
      organizationId: acme.id,
      campaignId: acmeCampaign.id,
      mediaContactId: acmeContacts[1].id,
      subject: "Interviewangebot Geschäftsführung",
      status: "FOLLOW_UP_DUE",
      sentAt: new Date("2026-03-08"),
      nextFollowUpDate: new Date("2026-03-20"),
      responseType: "NO_RESPONSE",
      followUpCount: 1,
    },
  });

  const acmePubOutreach = await prisma.outreach.create({
    data: {
      organizationId: acme.id,
      campaignId: acmeCampaign.id,
      mediaContactId: acmeContacts[2].id,
      subject: "Gastbeitrag zu E-Mobilität",
      status: "PUBLISHED",
      sentAt: new Date("2026-02-20"),
      responseReceivedAt: new Date("2026-02-22"),
      responseType: "ACCEPTED",
      acceptedAngle: "Servicenutzen",
      agreedTopic: "E-Mobilität im Alltag",
      publicationCreated: true,
      publicationUrl: "https://test-blog.test/e-mobilitaet",
    },
  });

  // ---- PR workflow demo data for Acme ----
  const acmeRaw = await prisma.clientRawInput.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      createdById: acmeOwner.id,
      title: "Website-Text Über uns",
      sourceType: "WEBSITE",
      status: "PROCESSED",
      rawText:
        "Nordwind Mobility ist Marktführer für nachhaltige City-E-Bikes. Unser Team hat über 15 Jahre Erfahrung. Wachstum von 40 Prozent im letzten Jahr.",
    },
  });

  await prisma.clientRawInput.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      createdById: acmeOwner.id,
      title: "Gesprächsnotiz Geschäftsführung",
      sourceType: "NOTE",
      status: "NEW",
      rawText: "Kurze Notiz.",
    },
  });

  // ---- Knowledge document + chunks (retrieval) from the website raw input ----
  const acmeDoc = await prisma.knowledgeDocument.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      rawInputId: acmeRaw.id,
      title: acmeRaw.title,
      sourceType: "WEBSITE",
      sourceName: "nordwind.test",
      content: acmeRaw.rawText ?? "",
      status: "ACTIVE",
    },
  });
  await prisma.knowledgeChunk.createMany({
    data: chunkText(acmeRaw.rawText ?? "").map((c) => ({
      organizationId: acme.id,
      clientId: acmeClientA.id,
      documentId: acmeDoc.id,
      chunkIndex: c.index,
      content: c.content,
      metadata: { sourceType: "WEBSITE", title: acmeRaw.title },
    })),
  });

  const acmeInsight = await prisma.clientInsight.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      insightType: "EXPERTISE",
      title: "15+ Jahre Erfahrung in E-Mobilität",
      content: "Langjährige Expertise als Aufhänger für Fachbeiträge.",
      confidence: 70,
      status: "APPROVED",
    },
  });

  await prisma.clientInsight.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      insightType: "PROOF_POINT",
      title: "40 % Wachstum",
      content: "Starkes Wachstum als Zahlen-Story nutzbar.",
      confidence: 65,
      status: "APPROVED",
    },
  });

  const acmeTopic = await prisma.topicIdea.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      campaignId: acmeCampaign.id,
      title: "Wie E-Bikes die Innenstädte verändern",
      description: "Trend-Story mit Einordnung durch Nordwind Mobility.",
      mediaAngle: "Trend-Story mit Einordnung",
      targetMediaType: "Online-Leitmedien",
      searchPotential: "HIGH",
      newsValue: "HIGH",
      priority: "HIGH",
      status: "APPROVED",
    },
  });

  const acmeBriefing = await prisma.briefing.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      campaignId: acmeCampaign.id,
      topicIdeaId: acmeTopic.id,
      mediaContactId: acmeContacts[0].id,
      title: "Briefing: E-Bikes in Innenstädten",
      targetAudience: "Online-Leitmedien",
      angle: "Trend-Story mit Einordnung",
      keyMessages: "1. Verkehrswende\n2. 40 % Wachstum\n3. Nachhaltigkeit",
      status: "APPROVED",
    },
  });

  await prisma.articleDraft.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      campaignId: acmeCampaign.id,
      briefingId: acmeBriefing.id,
      title: "E-Bikes in Innenstädten",
      subtitle: "Wie nachhaltige Mobilität die Stadt verändert",
      articleText:
        "## Einleitung\n\nStädte verändern sich.\n\n## Hauptteil\n\nNordwind Mobility ...\n\n## Fazit\n\nDie Zukunft ist elektrisch.",
      targetMedium: "Online-Leitmedien",
      status: "REVIEW",
    },
  });

  await prisma.publication.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      campaignId: acmeCampaign.id,
      mediaContactId: acmeContacts[2].id,
      title: "Gastbeitrag: E-Mobilität im Alltag",
      url: "https://test-blog.test/e-mobilitaet",
      publicationDate: new Date("2026-03-01"),
      resultingTopic: "E-Mobilität im Alltag",
      resultingAngle: "Servicenutzen",
      sourceOutreachId: acmePubOutreach.id,
    },
  });

  // Log media interactions (the learning signal).
  await prisma.mediaInteraction.createMany({
    data: [
      {
        organizationId: acme.id,
        mediaContactId: acmeContacts[2].id,
        outreachId: acmePubOutreach.id,
        interactionType: "PUBLICATION",
        result: "PUBLISHED",
        topicTitle: "E-Mobilität im Alltag",
        mediaAngle: "Servicenutzen",
      },
      {
        organizationId: acme.id,
        mediaContactId: acmeContacts[0].id,
        interactionType: "RESPONSE",
        result: "INTERESTED",
        topicTitle: "Vorab-Test City-E-Bike",
        mediaAngle: "Produkttest",
      },
    ],
  });

  // Reference the raw input + insight so unused-var checks stay clean.
  void acmeRaw;
  void acmeInsight;

  await prisma.writingRuleSet.createMany({
    data: [
      {
        organizationId: acme.id,
        name: "Redaktioneller PR-Pitch",
        description: "Kurzer, redaktioneller Themen-Pitch an Medienkontakte.",
        textType: "PITCH",
        targetMediumType: "Allgemein",
        toneOfVoice: "redaktionell, freundlich, nicht werblich",
        rules: "Persönlich ansprechen. Mediennutzen klar benennen. Kein Verkauf.",
        forbiddenPhrases: ["exklusives angebot", "weltbeste"],
        requiredElements: [
          "persönliche Ansprache",
          "klarer Themenvorschlag",
          "redaktioneller Nutzen",
          "Expertenkontext",
        ],
        minWords: 80,
        maxWords: 220,
        allowAnglicisms: false,
        allowFirstPerson: true,
      },
      {
        organizationId: acme.id,
        name: "Sachlicher Follow-up",
        description: "Kurzes, nicht drängendes Nachfassen.",
        textType: "FOLLOW_UP",
        toneOfVoice: "kurz, sachlich, freundlich",
        rules: "Maximal kurz. Bezug auf das Thema. Nicht drängen.",
        requiredElements: ["Themenbezug", "freundlicher Abschluss"],
        minWords: 40,
        maxWords: 120,
        allowAnglicisms: false,
        allowFirstPerson: true,
      },
      {
        organizationId: acme.id,
        name: "Expertenartikel",
        description: "Einordnender Fachbeitrag mit Beispielen.",
        textType: "ARTICLE",
        targetMediumType: "Fach- und Leitmedien",
        toneOfVoice: "sachlich, kompetent, einordnend",
        rules: "Aktiv schreiben. Fachbegriffe erklären. Beispiele nutzen.",
        forbiddenPhrases: ["revolutionär", "marktführend", "innovative lösung"],
        requiredElements: [
          "eigenständiger Einstieg",
          "These oder Problemstellung",
          "Argumentation",
          "Beispiele",
        ],
        preferredStructure: "Einstieg\nProblem\nEinordnung\nBeleg/Beispiel\nAusblick",
        minWords: 500,
        maxWords: 1000,
        allowAnglicisms: false,
        allowFirstPerson: false,
      },
      {
        organizationId: acme.id,
        name: "Servicetext für Verbrauchermedien",
        description: "Nutzwert-orientierter Text für ein breites Publikum.",
        textType: "ARTICLE",
        targetMediumType: "Verbrauchermedien",
        toneOfVoice: "verständlich, alltagsnah",
        rules: "Einfache Sprache. Konkreter Nutzen. Keine Fachsprache ohne Erklärung.",
        requiredElements: ["Alltagsnutzen", "konkrete Tipps", "Beispiele"],
        minWords: 350,
        maxWords: 700,
        allowAnglicisms: false,
        allowFirstPerson: false,
      },
      {
        organizationId: acme.id,
        name: "Fachmedien-Beitrag",
        description: "Tiefer Fachbeitrag für ein Fachpublikum.",
        textType: "ARTICLE",
        targetMediumType: "Fachmedien",
        toneOfVoice: "präzise fachlich, sachlich",
        rules: "Fachlich korrekt. Quellen nur, wenn belegt. Keine Werbesprache.",
        requiredElements: ["Fachkontext", "Argumentation", "belegbare Aussagen"],
        minWords: 600,
        maxWords: 1200,
        allowAnglicisms: true,
        allowFirstPerson: false,
      },
      {
        organizationId: acme.id,
        name: "Kundenreport",
        description: "Sachlicher Report über PR-Aktivitäten und Ergebnisse.",
        textType: "OTHER",
        targetMediumType: "Kunde",
        toneOfVoice: "sachlich, transparent",
        rules: "Nur belegbare Ergebnisse. Klar strukturieren. Keine Schönfärberei.",
        requiredElements: ["Zeitraum", "Maßnahmen", "Ergebnisse", "nächste Schritte"],
        minWords: 200,
        maxWords: 800,
        allowAnglicisms: false,
        allowFirstPerson: false,
      },
    ],
  });

  // ---- Knowledge layer + graph demo (built from raw inputs) ----
  const acmeTopicNode = await prisma.knowledgeNode.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      type: "TOPIC_FIELD",
      label: "E-Mobilität in Städten",
      description: "Themenfeld rund um nachhaltige urbane Mobilität.",
    },
  });
  const acmeExpNode = await prisma.knowledgeNode.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      type: "EXPERTISE",
      label: "15+ Jahre Erfahrung",
      description: "Langjährige Expertise im E-Bike-Bereich.",
    },
  });
  await prisma.knowledgeEdge.create({
    data: {
      organizationId: acme.id,
      clientId: acmeClientA.id,
      relation: "supports",
      fromNodeId: acmeExpNode.id,
      toNodeId: acmeTopicNode.id,
    },
  });

  await prisma.clientKnowledge.createMany({
    data: [
      {
        organizationId: acme.id,
        clientId: acmeClientA.id,
        category: "EXPERTISE",
        title: "15+ Jahre Erfahrung in E-Mobilität",
        content: "Langjährige Expertise als Aufhänger für Fachbeiträge.",
        confidence: 70,
        sourceIds: [acmeRaw.id],
      },
      {
        organizationId: acme.id,
        clientId: acmeClientA.id,
        category: "TOPIC_FIELD",
        title: "E-Mobilität in Städten",
        content: "Trend-Thema mit hohem Suchpotenzial.",
        confidence: 65,
        sourceIds: [acmeRaw.id],
      },
    ],
  });

  await prisma.aIUsageLog.create({
    data: {
      organizationId: acme.id,
      userId: acmeOwner.id,
      agent: "topicAgent",
      provider: "mock",
      mode: "mock",
      model: "mock-1",
      latencyMs: 3,
      success: true,
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
      status: "INTERESTED",
      sentAt: new Date("2026-05-10"),
    },
  });

  // Build media intelligence (MediaPerformance + JournalistPreference) from the
  // seeded interactions.
  await recomputeAllContacts(acme.id);
  await recomputeAllContacts(globe.id);

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
