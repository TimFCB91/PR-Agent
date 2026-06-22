# PR-Agent

Eine Multi-Tenant SaaS-Grundlage für PR-Agenturen, Freelancer und
Kommunikationsabteilungen. Der Fokus liegt bewusst auf einer **sauberen,
sicheren SaaS-Basis** – noch ohne KI, Stripe oder Agenten.

## Tech Stack

- **Next.js** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma**
- **Auth.js** (NextAuth v5, Credentials, JWT-Sessions)
- **Zod** für Validierung
- **Tailwind CSS** für ein schlichtes Dashboard

## Funktionen

- **Multi-Tenant-Architektur**: Jeder Nutzer gehört genau einer Organisation.
- **Rollen**: `OWNER`, `ADMIN`, `EDITOR`, `VIEWER` (Viewer = nur lesen).
- **Strikte Tenant-Isolation**: Jede Datenbankabfrage wird nach
  `organizationId` gefiltert. Kein Nutzer sieht Daten anderer Organisationen.
- **CRUD** für Kunden, Kampagnen, Medienkontakte und Outreach.
- **CSV-Import** für Medienkontakte.
- **Dashboard** mit Kennzahlen und letzten Aktivitäten.
- **Seed-Daten** mit zwei fiktiven Organisationen (keine echten Personen/Medien).

## Datenmodell

| Modell         | Beschreibung                                | Tenant-Feld      |
| -------------- | ------------------------------------------- | ---------------- |
| `Organization` | Mandant (Tenant)                            | –                |
| `User`         | Nutzer mit Rolle, gehört zu einer Org       | `organizationId` |
| `Client`       | Auftraggeber / Kunde                        | `organizationId` |
| `Campaign`     | PR-Kampagne eines Kunden                    | `organizationId` |
| `MediaContact` | Journalist:in / Redaktion                   | `organizationId` |
| `Outreach`     | Ansprache eines Kontakts in einer Kampagne  | `organizationId` |

Alle tenant-bezogenen Modelle besitzen eine `organizationId`.

## Sicherheitskonzept

Die Mandantentrennung ist an einer zentralen Stelle verankert:

- `src/lib/tenant.ts` liefert über `requireTenant()` den aktuellen
  `organizationId`/`role`-Kontext aus der Session.
- **Jede** Lese- und Schreiboperation auf tenant-eigene Daten verwendet diesen
  `organizationId` in der `where`-Bedingung.
- Updates/Deletes nutzen `updateMany`/`deleteMany` mit
  `{ id, organizationId }`, sodass fremde IDs ins Leere laufen.
- Verknüpfungen (z. B. Kampagne → Kunde) werden vor dem Speichern darauf
  geprüft, dass auch die referenzierten Datensätze zur Organisation gehören.
- Schreibaktionen erzwingen über `requireWriteAccess()` die passende Rolle.

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
    validations.ts     # Zod-Schemas
    csv.ts             # CSV-Parser
  actions/             # Server Actions (CRUD, Auth, Import)
  components/           # UI-Bausteine
  app/
    (auth)/            # Login / Registrierung
    dashboard/         # Geschütztes Dashboard inkl. aller Module
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

- Keine KI / keine Agenten
- Keine Stripe-/Billing-Integration

Zuerst die stabile SaaS-Basis – Erweiterungen folgen darauf.
```
