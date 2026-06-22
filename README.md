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
| `ClientKnowledge`| Zentrales, zusammengeführtes Kundenwissen           | `organizationId` |
| `KnowledgeNode`  | Knoten im Wissensgraph                               | `organizationId` |
| `KnowledgeEdge`  | Verbindung im Wissensgraph                           | `organizationId` |
| `AIUsageLog`     | Protokoll aller KI-Agenten-Aufrufe                  | `organizationId` |
| `TextQualityReport` | Qualitäts-/Faktencheck-Report je generiertem Text | `organizationId` |
| `KnowledgeDocument` | Durchsuchbares Dokument (aus RawInput/Upload)       | `organizationId` |
| `KnowledgeChunk`    | Abrufbares Textstück eines Dokuments (Retrieval)    | `organizationId` |
| `KnowledgeSourceRef`| Vom Agenten genutzte Quelle je Output (Nachweis)    | `organizationId` |
| `MediaPerformance`  | Aggregierte Kennzahlen je Medienkontakt             | `organizationId` |
| `MediaInteraction`  | Geloggte Interaktion (Lernsignal)                   | `organizationId` |
| `JournalistPreference` | Abgeleitete Vorlieben je Journalist:in           | `organizationId` |
| `MediaImportSession` | Protokoll eines Imports (CSV/Excel/Zimpel)          | `organizationId` |
| `MediaResearchResult` | Recherchierter Medienvorschlag (Freigabe nötig)    | `organizationId` |

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

## KI-gestütztes Knowledge- & Agentensystem

Auf der Workflow-Basis sitzt ein **KI-Layer**. Er ist **Mock-by-default**: ohne
`AI_MODE=real` werden keine externen Dienste aufgerufen – die Agenten liefern
deterministische Mock-Ergebnisse über die obigen Services. Per Umgebungsvariable
lässt sich auf echte Anbieter (OpenAI, Anthropic, lokale Modelle) umschalten,
ohne Agenten- oder UI-Code zu ändern.

### Knowledge Layer & Graph

- **`ClientKnowledge`** – zentrales, zusammengeführtes Wissen je Kunde
  (Kategorie, Titel, Inhalt, Konfidenz, `sourceIds`). Wird über
  „Wissen aufbauen" (Tab **Wissen**) aus allen Rohinformationen erzeugt.
- **`KnowledgeNode` / `KnowledgeEdge`** – vorbereiteter **Wissensgraph**, der
  zusammengehörige Informationen verknüpft (z. B. *Expertise* → `supports` →
  *Themenfeld*). Sichtbar im Tab **Wissensgraph**.
- Service: `lib/ai/knowledge/knowledgeBuilder.ts` (Mock, KI-ready).

### AI Provider Layer (`lib/ai/`)

Anbieterunabhängige Schnittstelle – Agenten kennen **nur** das Interface, nie
einen konkreten Anbieter:

| Datei                          | Aufgabe                                            |
| ------------------------------ | -------------------------------------------------- |
| `lib/ai/types.ts`              | `AIProvider`-Interface, Request/Result-Typen       |
| `lib/ai/config.ts`            | Liest `AI_MODE` / `AI_PROVIDER` / `AI_MODEL` (env)  |
| `lib/ai/provider.ts`          | Factory: Konfiguration → konkreter Provider         |
| `lib/ai/providers/mock.ts`    | Mock-Provider (Standard)                             |
| `lib/ai/providers/anthropic.ts` | Anthropic / Claude (`claude-opus-4-8`)            |
| `lib/ai/providers/openai.ts`  | OpenAI **und** lokale OpenAI-kompatible Endpunkte    |
| `lib/ai/prompts.ts`           | **Zentrale Prompt-Logik** (alle Agenten)            |

Die **Prompt-Logik liegt ausschließlich** in `lib/ai/prompts.ts` – bewusst als
strukturelle Builder (Rolle + Aufgabe + striktes JSON-Output-Format), nicht als
fertige, ausformulierte Prompts. Agenten enthalten keine Prompt-Strings.

### Agenten (`lib/ai/agents/`)

Jeder Agent hat **definierten Input/Output mit Zod-Validierung**, baut seinen
Prompt zentral und besitzt eine deterministische Mock-Implementierung. Der
gemeinsame Runner (`runAgent.ts`) übernimmt Mock/Real-Umschaltung, JSON-Parsing,
Output-Validierung, Fallback und **Usage-Logging**.

| Agent                  | Input → Output                                              |
| ---------------------- | ---------------------------------------------------------- |
| `topicAgent`           | Kundenwissen → Themen (Relevanz, Zielmedium, Winkel, …)    |
| `mediaMatchingAgent`   | Thema + Profil + Kontakte → Match-Score, Begründung, Winkel |
| `pitchAgent`           | Kontext → Betreff, Pitch-Mail, Begründung                  |
| `followUpAgent`        | Variante (3 Tage / 7 Tage / Zusage / Absage) → Follow-up   |
| `briefingAgent`        | Thema + Wissen → Titel, Kernaussagen, Struktur, No-Gos     |
| `articleAgent`         | Briefing + Schreibregeln → Titel, Untertitel, Artikel, Meta |

### Mock- vs. Real-Modus

```bash
AI_MODE="mock"            # Standard – keine externen Aufrufe
# oder:
AI_MODE="real"
AI_PROVIDER="anthropic"   # anthropic | openai | local
ANTHROPIC_API_KEY="sk-ant-..."
# AI_MODEL="claude-opus-4-8"   # optionaler Override
```

Für lokale Modelle (Ollama, vLLM, LM Studio): `AI_PROVIDER=local` +
`AI_LOCAL_BASE_URL`. Siehe `.env.example`.

### AI Usage Logging

Jeder Agenten-Aufruf wird in **`AIUsageLog`** protokolliert (Agent, Provider,
Modus, Modell, Tokens, Dauer, Erfolg, Nutzer) – tenant-isoliert. Einsehbar unter
**Einstellungen → AI**.

## Knowledge Retrieval

Erweitert das Client-Intake (keine separate Wissensdatenbank): Kundeninfos
werden dauerhaft gespeichert, strukturiert, durchsuchbar und für **alle Agenten**
abrufbar.

- **`KnowledgeDocument`** – durchsuchbare Form einer Information; wird **beim
  Anlegen eines `ClientRawInput` automatisch** erzeugt (der Rohinput bleibt
  erhalten). Kann später aus Website, PDF, Transkript, E-Mail, Social usw.
  entstehen.
- **`KnowledgeChunk`** – kontextschonend zerlegte, abrufbare Textstücke
  (`lib/knowledge/chunker.ts`, absatz-/satzweise, austauschbar). `embedding` ist
  für Semantic Search vorbereitet.
- **Retriever** (`lib/knowledge/retriever.ts`): `retrieveRelevantKnowledge({clientId,
  campaignId?, query, limit})` → relevante Chunks, Dokumentreferenzen,
  Relevanzwert. **Hybrid-Architektur**: Keyword-Suche läuft sofort; Semantic
  Search wird zugeschaltet, sobald ein Embedding-Provider konfiguriert ist
  (`lib/knowledge/embeddings.ts`: OpenAI / Voyage / lokal; Default aus →
  Keyword-only). Für Skalierung kann `KnowledgeChunk.embedding` auf **pgvector**
  umgestellt werden.
- **Pflichtschritt vor jeder Agentenausführung**: Die Agenten-Actions rufen
  zuerst `gatherKnowledge(...)` ab und übergeben die Chunks an den Agenten.
- **Quellenreferenzen**: Jeder Agent gibt `sourceReferences`
  (`{ documentId, chunkId, sourceType, shortExcerpt }`) und `missingInfo` zurück.
  Die genutzten Quellen werden in **`KnowledgeSourceRef`** gespeichert und in der
  UI pro Themenidee, Pitch, Briefing, Artikel und Follow-up angezeigt
  („Verwendete Quellen").
- **Fehlende Informationen**: Findet der Retriever nichts Belastbares, markiert
  der Agent dies (`missingInfo`) und erfindet keine Fakten.
- **Faktenkontrolle**: Knowledge-Dokumente fließen in den Evidence-Korpus von
  `FactSafetyCheck` / `EditorialChecklist` / `ArticleQualityEngine` ein – als
  Fakt formulierte Aussagen sind so auf gespeicherte Quellen rückführbar.
- **Kundenseite → Tab „Wissensquellen"**: Dokumente, Herkunft, Upload-Datum,
  Anzahl Chunks, Status.
- Alle Dokumente, Chunks und Referenzen sind strikt nach `organizationId`
  getrennt.

## Media Intelligence

Erweitert `MediaContact`, `Outreach`, `Campaign`, `TopicIdea` und `Publication`
(keine separate Plattform): das System **lernt aus echten Interaktionen**,
welche Medien, Journalist:innen, Themen und Winkel funktionieren.

- **Modelle**: `MediaInteraction` (geloggte Signale: pitch/follow_up/response/
  publication mit Ergebnis), `MediaPerformance` (aggregierte Kennzahlen je
  Kontakt) und `JournalistPreference` (automatisch abgeleitete Vorlieben).
  Zusätzliche Felder auf `Outreach` (responseType, responseReceivedAt,
  rejectionReason, acceptedAngle, followUpCount, publicationCreated …) und
  `Publication` (resultingTopic, resultingAngle, sourceOutreachId,
  performanceNotes).
- **`lib/media/mediaPerformanceCalculator.ts`** (rein): Reply-/Acceptance-/
  Publication-Rate, Ø Antwortzeit, Erfolgsquote pro Thema und pro Winkel.
- **`lib/media/mediaIntelligence.ts`**: protokolliert Interaktionen, berechnet
  Performance + Preferences neu (`recompute…`), erkennt Muster und liefert eine
  **Media Intelligence Summary** (z. B. „Winkel ‚Servicenutzen' funktioniert
  besonders gut"). Architektur ist für spätere Empfehlungs-KI vorbereitet
  (noch keine echte Vorhersage-KI).
- **Erfassung**: Beim Speichern einer Outreach-Reaktion (Formular) wird eine
  `MediaInteraction` geloggt und die Performance des Kontakts neu berechnet.
- **Agenten-Integration**:
  - *Topic Agent* nutzt historische Ergebnisse – ähnliche erfolgreiche Themen
    erhöhen die Priorität, häufige Misserfolge erzeugen einen Warnhinweis.
  - *Media Matching Agent* bewertet zusätzlich zur fachlichen Passung den
    **Historical Success Score** (vergangene Zusagen/Veröffentlichungen,
    erfolgreiche Winkel) und meidet abgelehnte Themen.
  - *Pitch Agent* gibt **empfohlenen Winkel** und **Erfolgswahrscheinlichkeit**
    auf Basis der Kontakt-Historie zurück.
- **In bestehenden Seiten** sichtbar: Campaign Dashboard (Reply-/Acceptance-/
  Publication-Rate, Top-Medien/-Themen/-Winkel, häufigste Ablehnungsgründe),
  MediaContact-Detailseite (Quoten, letzte Kontakte, Veröffentlichungen,
  bevorzugte Themen/Formate) und der Campaign Report (auch extern).
- Alle Media-Intelligence-Daten sind strikt nach `organizationId` getrennt.

## Medienkontakte: Anlegen, Import & Recherche

Medienkontakte entstehen auf drei Wegen – danach funktionieren **alle
identisch** in Matching, Outreach, Reporting und Intelligence (keine
Insellösung). Provenienz wird auf `MediaContact` gespeichert (`sourceType`,
`sourceImportId`, `sourceUrls`, `importedAt`, `verifiedAt`,
`verificationStatus`).

**1. Manuell** – wie bisher über das Formular.

**2. Import** (CSV / Excel / Zimpel) – `lib/media/importers/`:
- `importMapper.ts` erkennt Spalten automatisch (Medium, Ressort, Vor-/
  Nachname, Name, E-Mail, Telefon, Website, Region, Land, Themen, Medientyp,
  Notizen – inkl. deutscher/Zimpel-Labels); nicht erkannte Spalten landen als
  `metadata` (→ Notizen).
- `csvImporter.ts`, `excelImporter.ts` (xlsx), `zimpelImporter.ts` (erkennt
  typische Zimpel-Exporte als CSV/Excel – keine Zimpel-API nötig).
- `importValidator.ts` validiert je Datensatz und erkennt **Dubletten**
  (gleiche E-Mail · Name+Medium · Website · Medienname) mit Optionen
  **überspringen / aktualisieren / neu anlegen**.
- Jeder Lauf wird als **`MediaImportSession`** protokolliert (Quelle, Datei,
  Anzahl gültig/ungültig, Status). UI: „Kontakte importieren" auf der
  Medienkontakte-Seite.

**3. Internetrecherche** – `lib/media/mediaResearchAgent.ts` +
`mediaResearchProvider.ts` + `mediaResearchValidator.ts`:
- Input: Kunde, Kampagne, Themenidee, Branche, Zielgruppe, Region, Medientyp.
- Output je Vorschlag: Medium, Website, Medientyp, Ressort, Region,
  Ansprechpartner/Rolle (nur mit Quelle), Kontaktseite, E-Mail (nur öffentlich
  belegt), **Quellen**, Relevanzbegründung, vorgeschlagener Winkel, Confidence.
- **Compliance** (im `mediaResearchValidator`): keine erfundenen Personen, keine
  geratenen E-Mails, keine Daten ohne Quelle – nur öffentlich Zugängliches. Der
  Default-Provider ist ein **Mock** (keine Netzzugriffe); ein Live-Provider
  (LLM + Websuche über öffentliche Quellen) ist über dieselbe Schnittstelle
  vorbereitet.
- Ergebnisse werden als **`MediaResearchResult`** (Status `suggested`)
  gespeichert und **nie automatisch übernommen**: Auf dem Campaign-Dashboard
  („Passende Medien recherchieren") sieht der Nutzer Vorschlag, Quellen,
  Relevanz und Winkel und übernimmt (→ `MediaContact` mit `internet_research`-
  Provenienz) oder lehnt ab.

## Schreibregel-, Qualitäts- & Faktencheck-Engine

Jeder generierte Text (Pitch, Follow-up, Briefing, Artikel) durchläuft eine
redaktionelle Qualitätsprüfung – das System arbeitet wie ein PR-Lektorat, nicht
wie ein generischer Textgenerator. Alle Prüfungen sind **reine Funktionen**
(KI-ready), zentral verwaltet und werden von allen Agenten genutzt.

### Schreibregel-Engine (`lib/writing/`)

| Datei                          | Aufgabe                                                  |
| ------------------------------ | ------------------------------------------------------- |
| `rules.ts`                     | Zentrale, effektive Regeln (Stilprofil + Regelset)      |
| `forbiddenPhrases.ts`          | Anti-KI-Floskel-Liste                                    |
| `styleProfiles.ts`             | Stilprofile je Texttyp (Tonalität, Pflicht-Elemente)    |
| `qualityChecklist.ts`          | Lektorats-Kriterien A–D als Daten + Runner              |
| `textAnalyzer.ts`              | Metriken (Satzlänge, Passiv, Nominalstil, Wiederholung) |
| `rewriteEngine.ts`             | Konservative Überarbeitung (entfernt nur, erfindet nie) |

### Qualitäts- & Faktenchecks (`lib/quality/`)

- **`factSafetyCheck.ts`** – Grundregel **keine erfundenen Fakten**: prüft den
  Text gegen das im System hinterlegte Wissen (Rohinfos, Insights, Knowledge,
  Briefing). Erkennt nicht belegte Zahlen, Zitate, Studien/Quellen und
  Kundenreferenzen. Output: `{ passed, unsupportedClaims, missingEvidence, riskNotes }`.
- **`claimReasonProofCheck.ts`** – **Behauptung + Begründung + Beleg**: erkennt
  unbegründete, vage oder rein werbliche Aussagen.
- **`aiPatternCheck.ts`** – Anti-KI-Floskel-System (Floskeln, Gedankenstrich-
  Stil, Dreier-Adjektivketten, künstliche Antithesen). Output:
  `{ passed, detectedPatterns, severity, rewriteRequired }`.
- **`editorialChecklist.ts`** – Lektorats-Checkliste (A Inhalt, B Stil,
  C PR-Tonalität, D Textlogik). Output: `{ score, passed, issues, recommendations, mustFix }`.

### Article Quality Engine (`lib/articles/articleQualityEngine.ts`)

Orchestriert alle Checks zu einem `QualityReport` mit Score, Status und
`canApprove`. **Statuslogik** (`TextQualityStatus`):
`generated → checked → needs_review → revised → approved → rejected`.

Ein Text ist **nur freigebbar**, wenn alle vier Bedingungen erfüllt sind:
FactSafety bestanden · AI-Pattern bestanden · Editorial-Score ≥ 85 · keine
offenen `mustFix`. **Bei Faktenrisiken gibt es keine harte Freigabe** – auch
nicht manuell.

### Persistenz & UI

Reports werden in **`TextQualityReport`** gespeichert (pro Entität, tenant-
isoliert). Im UI erscheint bei Pitch, Follow-up (Outreach bearbeiten) sowie
Briefing und Artikel (Kundenseite) ein Qualitätsbereich mit Score,
Faktenproblemen, KI-Floskeln, Werblichkeit, Wiederholungen, Vorschlägen und den
Buttons **Text überarbeiten**, **Manuell freigeben** und **Ablehnen**.

### Writing Rule Sets

`WritingRuleSet` steuert die Prüfung je Texttyp – Felder u. a. `textType`
(`pitch`, `follow_up`, `briefing`, `article`, `press_release`, `linkedin`,
`other`), `toneOfVoice`, `targetMediumType`, `requiredElements`,
`forbiddenPhrases`, `minWords`/`maxWords`, `allowAnglicisms`, `allowFirstPerson`,
`allowGendering`, `allowDirectClientMention`. Sechs Standard-Regelsets werden
geseedet (PR-Pitch, Follow-up, Expertenartikel, Servicetext, Fachmedien-Beitrag,
Kundenreport).

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
    ai/                # AI-Layer: provider/, agents/, prompts.ts, knowledge/
    writing/           # Schreibregel-Engine (rules, analyzer, rewrite, …)
    quality/           # Fact-/Claim-/AI-Pattern-/Editorial-Checks + Report-Store
    knowledge/         # Knowledge Retrieval (chunker, retriever, embeddings, ingest, sources)
    media/             # Media Intelligence + importers/ (csv/excel/zimpel) + research (provider/agent/validator)
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

## KI-Status

- **Provider-, Agenten- und Knowledge-Architektur sind vollständig vorhanden**
  und über `AI_MODE` zwischen **Mock** und **Real** umschaltbar.
- **Standard ist Mock** – ohne API-Key/`AI_MODE=real` werden keine externen
  KI-Dienste aufgerufen. So bleibt das System ohne Kosten lauffähig und testbar.
- Real-Modus unterstützt **OpenAI**, **Anthropic** und **lokale Modelle** über
  dieselbe Schnittstelle.

## Bewusst (noch) nicht enthalten

- **Keine Stripe-/Billing-Integration.**

Fokus: stabiles Datenmodell, sauberer Workflow, klare KI-Architektur und
Skalierbarkeit.
