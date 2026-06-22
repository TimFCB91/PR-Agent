# PR-Agent

Eine Multi-Tenant SaaS-Plattform für PR-Agenturen, Freelancer und
Kommunikationsabteilungen. Sie bildet den **gesamten PR-Prozess** ab – vom
unsortierten Kunden-Input über strukturierte Erkenntnisse, Themenideen,
Briefings und Artikelentwürfe bis zu Outreach, Veröffentlichungen und Reporting.

> **Hinweis:** Es ist **noch keine echte KI** integriert. Die Workflow-Schritte
> (Erkenntnisse ableiten, Themen generieren, Pitches/Briefings/Artikel
> erstellen, Qualität prüfen) laufen über **Mock-Services** in `src/lib/`. Die
> Architektur ist so geschnitten, dass diese Services später ohne Änderung der
> Aufrufer (Actions/UI) durch KI-Aufrufe ersetzt werden können. Ebenso bewusst
> ausgelassen: **Stripe/Billing** und autonome **Agenten**.

## Tech Stack

- **Next.js** (App Router, Server Actions) + **TypeScript**
- **PostgreSQL** + **Prisma**
- **Auth.js** (NextAuth v5, Credentials, JWT-Sessions)
- **Zod** für Validierung
- **Tailwind CSS** für ein schlichtes Dashboard

## Funktionen

- **Multi-Tenant-Architektur**: Jeder Nutzer gehört genau einer Organisation.
- **Rollen**: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER` (Viewer = nur lesen).
- **Strikte Tenant-Isolation**: Jede Datenbankabfrage wird nach
  `organizationId` gefiltert. Kein Nutzer sieht Daten anderer Organisationen.
- **Kompletter PR-Workflow** je Kunde (siehe unten).
- **CRUD** für Kunden, Kampagnen, Medienkontakte, Outreach sowie alle
  Workflow-Objekte (Rohinformationen, Erkenntnisse, Themen, Briefings, Artikel,
  Veröffentlichungen) und Schreibregeln.
- **CSV-Import** für Medienkontakte und **CSV-Export** für Medienkontakte,
  Outreach und Veröffentlichungen.
- **Kunden-Dashboard mit Tabs** und **Kampagnen-Dashboard mit Kennzahlen**.
- **Campaign Report** inkl. **externer Read-Only-Ansicht** über einen Share-Link.
- **Seed-Daten** mit zwei fiktiven Organisationen (keine echten Personen/Medien).

## PR-Workflow

```
Rohinformation  →  Erkenntnis  →  Themenidee  →  Briefing  →  Artikelentwurf
(ClientRawInput)  (ClientInsight)  (TopicIdea)   (Briefing)   (ArticleDraft)
                                       │                            │
                                       └────────  Outreach  ────────┴──→ Veröffentlichung
                                                 (Outreach)              (Publication)
```

1. **Client Intake** – beliebige Kundeninfos hochladen/einfügen
   (`ClientRawInput`: Website-Texte, Transkripte, Briefings, E-Mails, Social,
   Presskits, Notizen …).
2. **Erkenntnisse** – `intakeProcessor` leitet (Mock) strukturierte
   `ClientInsight`-Entwürfe ab (Positionierung, Expertise, Zielgruppe, Proof
   Points, Zitate, Themenfelder, No-Gos, Risiken, fehlende Infos, Medienansätze).
3. **Themen** – `topicManager` erzeugt aus freigegebenen Erkenntnissen
   `TopicIdea`s inkl. Bewertung (Such-/Newswert, Priorität).
4. **Briefings** – `briefingManager` baut aus einem Thema ein `Briefing`.
5. **Artikel** – `articleBuilder` erzeugt einen `ArticleDraft`;
   `articleQualityChecker` prüft ihn gegen ein `WritingRuleSet`.
6. **Outreach** – erweiterter Lebenszyklus
   (`draft → ready → sent → follow_up_due → interested → accepted → declined →
   article_delivered → published`) inkl. Pitch-/Follow-up-Mail (Mock),
   Follow-up-Daten und Notizen.
7. **Veröffentlichungen** – platzierte Beiträge (`Publication`).
8. **Reporting** – Kennzahlen je Kampagne, optional extern teilbar.

## Datenmodell

| Modell           | Beschreibung                                         | Tenant-Feld      |
| ---------------- | --------------------------------------------------- | ---------------- |
| `Organization`   | Mandant (Tenant)                                    | –                |
| `User`           | Nutzer mit Rolle, gehört zu einer Org               | `organizationId` |
| `Client`         | Auftraggeber / Kunde                                | `organizationId` |
| `Campaign`       | PR-Kampagne eines Kunden (+ Share-Token für Report) | `organizationId` |
| `MediaContact`   | Journalist:in / Redaktion                           | `organizationId` |
| `Outreach`       | Ansprache eines Kontakts in einer Kampagne          | `organizationId` |
| `ClientRawInput` | Unsortierte Kundeninformation (Intake)              | `organizationId` |
| `ClientInsight`  | Strukturierte Erkenntnis zum Kunden                 | `organizationId` |
| `TopicIdea`      | Themenidee / Story-Angle                            | `organizationId` |
| `Briefing`       | Briefing für Pitch/Artikel                          | `organizationId` |
| `ArticleDraft`   | Artikelentwurf                                      | `organizationId` |
| `Publication`    | Veröffentlichung (platzierte Berichterstattung)     | `organizationId` |
| `WritingRuleSet` | Schreibregeln für die spätere Artikel-Erstellung    | `organizationId` |

Alle tenant-bezogenen Modelle besitzen eine `organizationId`.

## Services (Mock, KI-ready)

In `src/lib/` liegen die austauschbaren Workflow-Services – reine Funktionen
(Daten rein, Daten raus), damit sie später 1:1 durch KI-Aufrufe ersetzt werden
können:

| Datei                                   | Aufgabe                                   |
| --------------------------------------- | ----------------------------------------- |
| `lib/intake/intakeProcessor.ts`         | Rohinfo → Erkenntnis-Vorschläge           |
| `lib/topics/topicManager.ts`            | Erkenntnisse → Themenideen (mit Scoring)  |
| `lib/outreach/outreachManager.ts`       | Pitch-/Follow-up-Mails, Status-Logik      |
| `lib/briefings/briefingManager.ts`      | Thema → Briefing                          |
| `lib/articles/articleBuilder.ts`        | Briefing (+ Regeln) → Artikelentwurf      |
| `lib/articles/articleQualityChecker.ts` | Artikel gegen Schreibregeln prüfen        |

## Sicherheitskonzept

Die Mandantentrennung ist an einer zentralen Stelle verankert:

- `src/lib/tenant.ts` liefert über `requireTenant()` den aktuellen
  `organizationId`/`role`-Kontext aus der Session.
- **Jede** Lese- und Schreiboperation auf tenant-eigene Daten verwendet diesen
  `organizationId` in der `where`-Bedingung.
- Updates/Deletes nutzen `updateMany`/`deleteMany` mit
  `{ id, organizationId }`, sodass fremde IDs ins Leere laufen.
- Verknüpfungen (z. B. Kampagne → Kunde, Briefing → Thema/Kontakt) werden vor
  dem Speichern darauf geprüft, dass auch die referenzierten Datensätze zur
  Organisation gehören.
- Schreibaktionen erzwingen über `requireWriteAccess()` die passende Rolle.
- Die **externe Read-Only-Ansicht** (`/report/<token>`) ist nur über einen
  zufälligen, pro Kampagne aktivierbaren Share-Token erreichbar; sie liest
  ausschließlich Daten der zugehörigen Organisation (über die Kampagne
  abgeleitet) und lässt sich jederzeit wieder deaktivieren.

## Lokales Setup

### Voraussetzungen

- Node.js 20+
- PostgreSQL 14+

### Schritte

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env
#   - DATABASE_URL auf die eigene Postgres-Instanz setzen
#   - AUTH_SECRET erzeugen:  openssl rand -base64 32

# 3. Datenbankschema anlegen
npm run db:migrate     # erstellt die Migration und die Tabellen
#   (alternativ ohne Migrationshistorie: npm run db:push)

# 4. Demo-Daten einspielen
npm run db:seed

# 5. Entwicklungsserver starten
npm run dev
```

Die App läuft anschließend unter http://localhost:3000.

### Demo-Logins

Alle Demo-Nutzer haben das Passwort **`password123`**.

| Organisation | E-Mail              | Rolle  |
| ------------ | ------------------- | ------ |
| Acme PR      | `owner@acme.test`   | OWNER  |
| Acme PR      | `admin@acme.test`   | ADMIN  |
| Acme PR      | `editor@acme.test`  | EDITOR |
| Acme PR      | `viewer@acme.test`  | VIEWER |
| Globe Comms  | `owner@globe.test`  | OWNER  |

Melden Sie sich mit Nutzern beider Organisationen an, um die Tenant-Isolation
zu sehen: Daten von „Acme PR“ sind für „Globe Comms“ unsichtbar.

## CSV-Import

Unter **Medienkontakte** lässt sich eine CSV-Datei hochladen. Erwartete
Kopfzeile (Groß-/Kleinschreibung egal):

```
firstName,lastName,email,phone,outlet,beat,notes
```

Eine Beispieldatei liegt unter
[`examples/media-contacts-sample.csv`](examples/media-contacts-sample.csv).
Ungültige Zeilen werden übersprungen und im Ergebnis gemeldet.

## CSV-Export

Folgende Daten lassen sich (organisationsweit, tenant-isoliert) als CSV
exportieren – Buttons befinden sich auf den jeweiligen Seiten:

- Medienkontakte → `/api/export/media-contacts`
- Outreach → `/api/export/outreach`
- Veröffentlichungen → `/api/export/publications`

## Campaign Report & externe Ansicht

Jede Kampagne hat ein Dashboard (`/dashboard/campaigns/<id>`) mit Kennzahlen
(Themen, Pitches, offene Follow-ups, Zusagen, Absagen, Veröffentlichungen).
Über „Externen Report freigeben“ wird ein Share-Token erzeugt; die öffentliche,
anmeldefreie Read-Only-Ansicht ist dann unter `/report/<token>` erreichbar und
als Kundenreport nutzbar. In den Demo-Daten ist die Kampagne „Produktlaunch
E-Bike 2026“ bereits freigegeben: `/report/demo-report-token`.

## Schreibregeln

Unter **Einstellungen → Schreibregeln** lassen sich `WritingRuleSet`s pflegen
(Tonalität, bevorzugte Struktur, verbotene Formulierungen, Wortzahl-Grenzen).
Sie werden vom `articleBuilder` und vom `articleQualityChecker` herangezogen –
und bilden die Grundlage dafür, dass Artikel später regelkonform (auch per KI)
erzeugt werden.

## Projektstruktur

```
prisma/
  schema.prisma        # Datenmodell (Multi-Tenant)
  seed.ts              # Demo-Daten
src/
  auth.ts              # Auth.js Konfiguration (Credentials)
  auth.config.ts       # Edge-sichere Auth-Konfiguration (Middleware)
  middleware.ts        # Schützt /dashboard
  lib/
    prisma.ts          # Prisma-Client-Singleton
    tenant.ts          # requireTenant / Rollen-Checks (Sicherheitskern)
    action-helpers.ts  # writeAccess()-Helper für Server Actions
    validations.ts     # Zod-Schemas
    csv.ts             # CSV-Parser + -Export
    reporting.ts       # Kampagnen-Kennzahlen (Dashboard + Report)
    intake/ topics/ outreach/ briefings/ articles/   # Mock-Services (KI-ready)
  actions/             # Server Actions (CRUD, Auth, Import, Workflow)
  components/           # UI-Bausteine (ui, delete-button, action-button, sidebar)
  app/
    (auth)/            # Login / Registrierung
    dashboard/         # Geschütztes Dashboard inkl. aller Module
      clients/[id]/    # Kunden-Detail mit Tabs (Workflow)
      campaigns/[id]/  # Kampagnen-Dashboard
      settings/writing-rules/  # Schreibregeln-CRUD
    report/[token]/    # Öffentliche Read-Only-Report-Ansicht
    api/export/        # CSV-Exporte
```

## Verfügbare Skripte

| Skript              | Zweck                              |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Entwicklungsserver                 |
| `npm run build`     | Produktions-Build                  |
| `npm run start`     | Produktionsserver                  |
| `npm run typecheck` | TypeScript-Prüfung                 |
| `npm run db:migrate`| Prisma-Migration (Entwicklung)     |
| `npm run db:push`   | Schema ohne Migration anwenden     |
| `npm run db:seed`   | Demo-Daten einspielen              |
| `npm run db:reset`  | DB zurücksetzen + neu seeden       |

## Bewusst (noch) nicht enthalten

- **Keine echte KI** – die Workflow-Schritte laufen über Mock-Services, die
  als klare Erweiterungspunkte für spätere KI-Aufrufe dienen.
- **Keine autonomen Agenten.**
- **Keine Stripe-/Billing-Integration.**

Fokus: stabiles Datenmodell, sauberer Workflow und Skalierbarkeit. Erweiterungen
(insbesondere KI) bauen auf dieser Basis auf.
