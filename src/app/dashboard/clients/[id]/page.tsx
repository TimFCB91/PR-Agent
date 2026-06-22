import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import {
  Card,
  PageHeader,
  LinkButton,
  EmptyState,
  Badge,
} from "@/components/ui";
import { DeleteButton } from "@/components/delete-button";
import { ActionButton } from "@/components/action-button";
import { QualityPanel } from "@/components/quality-panel";
import { KnowledgeSources } from "@/components/knowledge-sources";

import {
  createRawInputAction,
  deleteRawInputAction,
  processRawInputAction,
} from "@/actions/raw-inputs";
import {
  createInsightAction,
  updateInsightStatusAction,
  deleteInsightAction,
  generateTopicsAction,
} from "@/actions/insights";
import {
  createTopicAction,
  deleteTopicAction,
  buildBriefingFromTopicAction,
} from "@/actions/topics";
import {
  createBriefingAction,
  deleteBriefingAction,
  buildArticleFromBriefingAction,
} from "@/actions/briefings";
import {
  createArticleAction,
  updateArticleStatusAction,
  deleteArticleAction,
  checkArticleQualityAction,
} from "@/actions/articles";
import {
  createPublicationAction,
  deletePublicationAction,
} from "@/actions/publications";
import {
  buildKnowledgeAction,
  generateTopicsFromKnowledgeAction,
  buildBriefingViaAgentAction,
  buildArticleViaAgentAction,
  matchAndCreateOutreachAction,
} from "@/actions/ai";

import { RawInputForm } from "./_forms/raw-input-form";
import { InsightForm } from "./_forms/insight-form";
import { TopicForm } from "./_forms/topic-form";
import { BriefingForm } from "./_forms/briefing-form";
import { ArticleForm } from "./_forms/article-form";
import { PublicationForm } from "./_forms/publication-form";

const TABS = [
  { key: "overview", label: "Übersicht" },
  { key: "raw", label: "Rohinformationen" },
  { key: "insights", label: "Erkenntnisse" },
  { key: "knowledge", label: "Wissen" },
  { key: "graph", label: "Wissensgraph" },
  { key: "documents", label: "Wissensquellen" },
  { key: "topics", label: "Themen" },
  { key: "contacts", label: "Medienkontakte" },
  { key: "outreach", label: "Outreach" },
  { key: "briefings", label: "Briefings" },
  { key: "articles", label: "Artikel" },
  { key: "publications", label: "Veröffentlichungen" },
] as const;

function fmtDate(value?: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

const th =
  "px-5 py-3 font-medium text-xs uppercase tracking-wide text-gray-500";
const td = "px-5 py-3 text-gray-600";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "overview";

  const { organizationId, role } = await requireTenant();
  const writable = canWrite(role);

  const client = await prisma.client.findFirst({
    where: { id, organizationId },
  });
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title={client.name}
        action={
          writable && (
            <LinkButton href={`/dashboard/clients/${id}/edit`} variant="secondary">
              Bearbeiten
            </LinkButton>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 pb-3">
        {TABS.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <Link
              key={t.key}
              href={`/dashboard/clients/${id}?tab=${t.key}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <OverviewTab clientId={id} organizationId={organizationId} />
      )}
      {activeTab === "raw" && (
        <RawTab clientId={id} organizationId={organizationId} writable={writable} />
      )}
      {activeTab === "insights" && (
        <InsightsTab
          clientId={id}
          organizationId={organizationId}
          writable={writable}
        />
      )}
      {activeTab === "knowledge" && (
        <KnowledgeTab
          clientId={id}
          organizationId={organizationId}
          writable={writable}
        />
      )}
      {activeTab === "graph" && (
        <GraphTab clientId={id} organizationId={organizationId} />
      )}
      {activeTab === "documents" && (
        <DocumentsTab clientId={id} organizationId={organizationId} />
      )}
      {activeTab === "topics" && (
        <TopicsTab
          clientId={id}
          organizationId={organizationId}
          writable={writable}
        />
      )}
      {activeTab === "contacts" && (
        <ContactsTab organizationId={organizationId} />
      )}
      {activeTab === "outreach" && (
        <OutreachTab clientId={id} organizationId={organizationId} />
      )}
      {activeTab === "briefings" && (
        <BriefingsTab
          clientId={id}
          organizationId={organizationId}
          writable={writable}
        />
      )}
      {activeTab === "articles" && (
        <ArticlesTab
          clientId={id}
          organizationId={organizationId}
          writable={writable}
        />
      )}
      {activeTab === "publications" && (
        <PublicationsTab
          clientId={id}
          organizationId={organizationId}
          writable={writable}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

async function OverviewTab({
  clientId,
  organizationId,
}: {
  clientId: string;
  organizationId: string;
}) {
  const where = { clientId, organizationId };
  const [
    rawInputs,
    insights,
    topics,
    briefings,
    articleDrafts,
    publications,
    campaigns,
  ] = await Promise.all([
    prisma.clientRawInput.count({ where }),
    prisma.clientInsight.count({ where }),
    prisma.topicIdea.count({ where }),
    prisma.briefing.count({ where }),
    prisma.articleDraft.count({ where }),
    prisma.publication.count({ where }),
    prisma.campaign.count({ where }),
  ]);

  const cards = [
    { label: "Rohinformationen", value: rawInputs },
    { label: "Erkenntnisse", value: insights },
    { label: "Themen", value: topics },
    { label: "Briefings", value: briefings },
    { label: "Artikel", value: articleDrafts },
    { label: "Veröffentlichungen", value: publications },
    { label: "Kampagnen", value: campaigns },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <div className="text-2xl font-semibold text-gray-900">{c.value}</div>
          <div className="mt-1 text-sm text-gray-500">{c.label}</div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

async function RawTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const items = await prisma.clientRawInput.findMany({
    where: { clientId, organizationId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const action = createRawInputAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      {writable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            ＋ Neue Rohinformation
          </summary>
          <div className="mt-3">
            <RawInputForm action={action} />
          </div>
        </details>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch keine Rohinformationen." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Quelle</th>
                <th className={th}>Status</th>
                <th className={th}>Erstellt</th>
                <th className={th}>Von</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {it.title}
                  </td>
                  <td className={td}>
                    <Badge value={it.sourceType} />
                  </td>
                  <td className={td}>
                    <Badge value={it.status} />
                  </td>
                  <td className={td}>{fmtDate(it.createdAt)}</td>
                  <td className={td}>{it.createdBy?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={processRawInputAction}
                          fields={{ id: it.id, clientId }}
                          label="Erkenntnisse generieren"
                        />
                        <DeleteButton
                          id={it.id}
                          action={deleteRawInputAction}
                          extraFields={{ clientId }}
                        />
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

// ---------------------------------------------------------------------------

async function InsightsTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const items = await prisma.clientInsight.findMany({
    where: { clientId, organizationId },
    orderBy: { createdAt: "desc" },
  });

  const action = createInsightAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      {writable && (
        <ActionButton
          action={generateTopicsAction}
          fields={{ clientId }}
          label="Themen aus Erkenntnissen generieren"
          variant="primary"
        />
      )}

      {writable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            ＋ Neue Erkenntnis
          </summary>
          <div className="mt-3">
            <InsightForm action={action} />
          </div>
        </details>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch keine Erkenntnisse." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Typ</th>
                <th className={th}>Titel</th>
                <th className={th}>Konfidenz</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className={td}>
                    <Badge value={it.insightType} />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {it.title}
                  </td>
                  <td className={td}>{it.confidence}</td>
                  <td className={td}>
                    <Badge value={it.status} />
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={updateInsightStatusAction}
                          fields={{ id: it.id, clientId, status: "APPROVED" }}
                          label="Freigeben"
                        />
                        <ActionButton
                          action={updateInsightStatusAction}
                          fields={{ id: it.id, clientId, status: "REJECTED" }}
                          label="Ablehnen"
                        />
                        <DeleteButton
                          id={it.id}
                          action={deleteInsightAction}
                          extraFields={{ clientId }}
                        />
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

// ---------------------------------------------------------------------------

async function KnowledgeTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const items = await prisma.clientKnowledge.findMany({
    where: { clientId, organizationId },
    orderBy: { confidence: "desc" },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Zentrales, zusammengeführtes Wissen — automatisch aus den
        Rohinformationen aufgebaut (KI-ready, aktuell Mock).
      </p>

      {writable && (
        <div className="flex gap-2 mb-4">
          <ActionButton
            action={buildKnowledgeAction}
            fields={{ clientId }}
            label="Wissen aufbauen"
            variant="primary"
          />
          <ActionButton
            action={generateTopicsFromKnowledgeAction}
            fields={{ clientId }}
            label="Themen aus Wissen generieren"
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch kein Wissen aufgebaut. Lege zuerst Rohinformationen an und klicke „Wissen aufbauen“." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Kategorie</th>
                <th className={th}>Titel</th>
                <th className={th}>Inhalt</th>
                <th className={th}>Konfidenz</th>
                <th className={th}>Quellen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className={td}>
                    <Badge value={k.category} />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {k.title}
                  </td>
                  <td className={td}>
                    <div className="max-w-md truncate">{k.content ?? "—"}</div>
                  </td>
                  <td className={td}>{k.confidence}%</td>
                  <td className={td}>{k.sourceIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

async function GraphTab({
  clientId,
  organizationId,
}: {
  clientId: string;
  organizationId: string;
}) {
  const [nodes, edges] = await Promise.all([
    prisma.knowledgeNode.findMany({
      where: { clientId, organizationId },
    }),
    prisma.knowledgeEdge.findMany({
      where: { clientId, organizationId },
    }),
  ]);

  const labelById = new Map<string, string>(
    nodes.map((n) => [n.id, n.label]),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Wissensgraph (vorbereitet): Knoten und Verbindungen, die zusammengehörige
        Informationen verknüpfen.
      </p>

      {nodes.length === 0 ? (
        <EmptyState message="Noch keine Knoten. Baue zuerst das Wissen auf." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-900">
              Knoten
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left">
                <tr>
                  <th className={th}>Typ</th>
                  <th className={th}>Label</th>
                  <th className={th}>Beschreibung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nodes.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className={td}>
                      <Badge value={n.type} />
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {n.label}
                    </td>
                    <td className={td}>{n.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 text-sm font-medium text-gray-900">
              Verbindungen
            </div>
            {edges.length === 0 ? (
              <div className="px-5 py-3 text-sm text-gray-500">
                Keine Verbindungen.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {edges.map((e) => (
                  <li key={e.id} className="px-5 py-3 text-sm text-gray-600">
                    {labelById.get(e.fromNodeId) ?? e.fromNodeId} → [{e.relation}]{" "}
                    → {labelById.get(e.toNodeId) ?? e.toNodeId}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

async function DocumentsTab({
  clientId,
  organizationId,
}: {
  clientId: string;
  organizationId: string;
}) {
  const items = await prisma.knowledgeDocument.findMany({
    where: { clientId, organizationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Dauerhaft gespeicherte, durchsuchbare Wissensquellen — automatisch beim
        Anlegen von Rohinformationen erzeugt.
      </p>

      {items.length === 0 ? (
        <EmptyState message="Noch keine Wissensquellen. Lege eine Rohinformation mit Text an — daraus wird automatisch ein durchsuchbares Dokument." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Quelle/Typ</th>
                <th className={th}>Herkunft</th>
                <th className={th}>Hochgeladen</th>
                <th className={th}>Chunks</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {d.title}
                  </td>
                  <td className={td}>
                    <Badge value={d.sourceType} />
                  </td>
                  <td className={td}>{d.sourceName ?? "—"}</td>
                  <td className={td}>
                    {d.createdAt.toLocaleDateString("de-DE")}
                  </td>
                  <td className={td}>{d._count.chunks}</td>
                  <td className={td}>
                    <Badge value={d.status} />
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

// ---------------------------------------------------------------------------

async function TopicsTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const [items, campaigns] = await Promise.all([
    prisma.topicIdea.findMany({
      where: { clientId, organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.findMany({
      where: { clientId, organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const action = createTopicAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      {writable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            ＋ Neues Thema
          </summary>
          <div className="mt-3">
            <TopicForm action={action} campaigns={campaigns} />
          </div>
        </details>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch keine Themen." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Aufhänger</th>
                <th className={th}>Medientyp</th>
                <th className={th}>Suche</th>
                <th className={th}>News</th>
                <th className={th}>Prio</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {it.title}
                  </td>
                  <td className={td}>{it.mediaAngle ?? "—"}</td>
                  <td className={td}>{it.targetMediaType ?? "—"}</td>
                  <td className={td}>
                    <Badge value={it.searchPotential} />
                  </td>
                  <td className={td}>
                    <Badge value={it.newsValue} />
                  </td>
                  <td className={td}>
                    <Badge value={it.priority} />
                  </td>
                  <td className={td}>
                    <Badge value={it.status} />
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={buildBriefingFromTopicAction}
                          fields={{ id: it.id, clientId }}
                          label="Briefing erstellen"
                        />
                        <ActionButton
                          action={buildBriefingViaAgentAction}
                          fields={{ id: it.id, clientId }}
                          label="KI-Briefing"
                        />
                        <ActionButton
                          action={matchAndCreateOutreachAction}
                          fields={{ id: it.id, clientId }}
                          label="Medien-Matching"
                        />
                        <DeleteButton
                          id={it.id}
                          action={deleteTopicAction}
                          extraFields={{ clientId }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          {items.map((t) => (
            <div key={t.id}>
              <KnowledgeSources
                entityType="TOPIC"
                entityId={t.id}
                organizationId={organizationId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

async function ContactsTab({ organizationId }: { organizationId: string }) {
  const contacts = await prisma.mediaContact.findMany({
    where: { organizationId },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Medienkontakte sind organisationsweit. Verknüpfung erfolgt über Outreach,
        Briefings und Veröffentlichungen.
      </p>
      <LinkButton href="/dashboard/media-contacts" variant="secondary">
        Zu den Medienkontakten
      </LinkButton>

      {contacts.length === 0 ? (
        <EmptyState message="Noch keine Medienkontakte." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>E-Mail</th>
                <th className={th}>Medium</th>
                <th className={th}>Ressort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className={td}>{c.email}</td>
                  <td className={td}>{c.outlet ?? "—"}</td>
                  <td className={td}>{c.beat ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

async function OutreachTab({
  clientId,
  organizationId,
}: {
  clientId: string;
  organizationId: string;
}) {
  const items = await prisma.outreach.findMany({
    where: { organizationId, campaign: { clientId } },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { name: true } },
      mediaContact: { select: { firstName: true, lastName: true } },
    },
  });

  return (
    <div className="space-y-4">
      <LinkButton href="/dashboard/outreach" variant="secondary">
        Zum Outreach
      </LinkButton>

      {items.length === 0 ? (
        <EmptyState message="Noch kein Outreach." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Betreff</th>
                <th className={th}>Kampagne</th>
                <th className={th}>Kontakt</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {it.subject}
                  </td>
                  <td className={td}>{it.campaign.name}</td>
                  <td className={td}>
                    {it.mediaContact.firstName} {it.mediaContact.lastName}
                  </td>
                  <td className={td}>
                    <Badge value={it.status} />
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

// ---------------------------------------------------------------------------

async function BriefingsTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const [items, campaigns, topics, contacts] = await Promise.all([
    prisma.briefing.findMany({
      where: { clientId, organizationId },
      orderBy: { createdAt: "desc" },
      include: { topicIdea: { select: { title: true } } },
    }),
    prisma.campaign.findMany({
      where: { clientId, organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.topicIdea.findMany({
      where: { clientId, organizationId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.mediaContact.findMany({
      where: { organizationId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const action = createBriefingAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      {writable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            ＋ Neues Briefing
          </summary>
          <div className="mt-3">
            <BriefingForm
              action={action}
              campaigns={campaigns}
              topics={topics}
              contacts={contacts}
            />
          </div>
        </details>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch keine Briefings." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Status</th>
                <th className={th}>Thema</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {it.title}
                  </td>
                  <td className={td}>
                    <Badge value={it.status} />
                  </td>
                  <td className={td}>{it.topicIdea?.title ?? "—"}</td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={buildArticleFromBriefingAction}
                          fields={{ id: it.id, clientId }}
                          label="Artikel erstellen"
                        />
                        <ActionButton
                          action={buildArticleViaAgentAction}
                          fields={{ id: it.id, clientId }}
                          label="KI-Artikel"
                        />
                        <DeleteButton
                          id={it.id}
                          action={deleteBriefingAction}
                          extraFields={{ clientId }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {items.map((b) => (
          <div key={b.id}>
            <p className="text-sm font-medium text-gray-700">{b.title}</p>
            <QualityPanel entityType="BRIEFING" entityId={b.id} clientId={clientId} organizationId={organizationId} writable={writable} />
            <KnowledgeSources entityType="BRIEFING" entityId={b.id} organizationId={organizationId} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function ArticlesTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const [items, campaigns, briefings] = await Promise.all([
    prisma.articleDraft.findMany({
      where: { clientId, organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.findMany({
      where: { clientId, organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.briefing.findMany({
      where: { clientId, organizationId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const action = createArticleAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      {writable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            ＋ Neuer Artikel
          </summary>
          <div className="mt-3">
            <ArticleForm
              action={action}
              campaigns={campaigns}
              briefings={briefings}
            />
          </div>
        </details>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch keine Artikel." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>Medium</th>
                <th className={th}>Status</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <div>{it.title}</div>
                    {it.qualityNotes && (
                      <pre className="whitespace-pre-wrap text-xs text-gray-600">
                        {it.qualityNotes}
                      </pre>
                    )}
                  </td>
                  <td className={td}>{it.targetMedium ?? "—"}</td>
                  <td className={td}>
                    <Badge value={it.status} />
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          action={checkArticleQualityAction}
                          fields={{ id: it.id, clientId }}
                          label="Qualität prüfen"
                        />
                        <ActionButton
                          action={updateArticleStatusAction}
                          fields={{ id: it.id, clientId, status: "REVIEW" }}
                          label="In Review"
                        />
                        <ActionButton
                          action={updateArticleStatusAction}
                          fields={{ id: it.id, clientId, status: "APPROVED" }}
                          label="Freigeben"
                        />
                        <DeleteButton
                          id={it.id}
                          action={deleteArticleAction}
                          extraFields={{ clientId }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {items.map((a) => (
          <div key={a.id}>
            <p className="text-sm font-medium text-gray-700">{a.title}</p>
            <QualityPanel entityType="ARTICLE" entityId={a.id} clientId={clientId} organizationId={organizationId} writable={writable} />
            <KnowledgeSources entityType="ARTICLE" entityId={a.id} organizationId={organizationId} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

async function PublicationsTab({
  clientId,
  organizationId,
  writable,
}: {
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const [items, campaigns, contacts] = await Promise.all([
    prisma.publication.findMany({
      where: { clientId, organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        mediaContact: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.campaign.findMany({
      where: { clientId, organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.mediaContact.findMany({
      where: { organizationId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const action = createPublicationAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      {writable && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            ＋ Neue Veröffentlichung
          </summary>
          <div className="mt-3">
            <PublicationForm
              action={action}
              campaigns={campaigns}
              contacts={contacts}
            />
          </div>
        </details>
      )}

      {items.length === 0 ? (
        <EmptyState message="Noch keine Veröffentlichungen." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className={th}>Titel</th>
                <th className={th}>URL</th>
                <th className={th}>Datum</th>
                <th className={th}>Kontakt</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {it.title}
                  </td>
                  <td className={td}>
                    {it.url ? (
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-700 underline"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>{fmtDate(it.publicationDate)}</td>
                  <td className={td}>
                    {it.mediaContact
                      ? `${it.mediaContact.firstName} ${it.mediaContact.lastName}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {writable && (
                      <div className="flex items-center justify-end">
                        <DeleteButton
                          id={it.id}
                          action={deletePublicationAction}
                          extraFields={{ clientId }}
                        />
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
