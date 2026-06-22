import type { TextEntityType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { QualityReport } from "@/lib/articles/articleQualityEngine";
import {
  rewriteTextAction,
  approveTextAction,
  rejectTextAction,
} from "@/actions/quality";
import { ActionButton } from "@/components/action-button";
import { Card, Badge } from "@/components/ui";

function List({ title, items, tone }: { title: string; items: string[]; tone: "red" | "amber" | "gray" }) {
  if (!items || items.length === 0) return null;
  const color =
    tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-gray-600";
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold ${color}`}>{title}</p>
      <ul className="mt-1 list-inside list-disc text-xs text-gray-600">
        {items.slice(0, 8).map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Quality area shown for a generated text (pitch / follow-up / briefing /
 * article). Loads the persisted TextQualityReport (tenant-scoped) and renders
 * score, fact problems, AI clichés, advertising/repetition issues, suggestions
 * and the action buttons. Manual approval is blocked on fact risks.
 */
export async function QualityPanel({
  entityType,
  entityId,
  clientId,
  organizationId,
  writable,
}: {
  entityType: TextEntityType;
  entityId: string;
  clientId: string;
  organizationId: string;
  writable: boolean;
}) {
  const row = await prisma.textQualityReport.findFirst({
    where: { entityType, entityId, organizationId },
  });
  if (!row) return null;

  const report = row.report as unknown as QualityReport;
  const factRisk = report.factSafety && report.factSafety.passed === false;
  const fields = { entityType, entityId, clientId };

  const scoreColor =
    row.score >= 85 ? "text-green-700" : row.score >= 60 ? "text-amber-700" : "text-red-700";

  return (
    <Card className="mt-2 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          Qualität:{" "}
          <span className={scoreColor}>{row.score}/100</span>
        </p>
        <Badge value={row.status} />
      </div>

      <List
        title="Faktenprobleme (mustFix)"
        items={[
          ...(report.factSafety?.unsupportedClaims ?? []),
          ...(report.factSafety?.riskNotes ?? []),
        ]}
        tone="red"
      />
      <List title="Pflicht-Korrekturen" items={report.editorial?.mustFix ?? []} tone="red" />
      <List title="KI-Floskeln" items={report.aiPattern?.detectedPatterns ?? []} tone="amber" />
      <List title="Werblichkeit / Inhalt" items={report.editorial?.issues ?? []} tone="amber" />
      <List
        title="Wiederholungen"
        items={report.metrics?.repeatedWords ?? []}
        tone="gray"
      />
      <List
        title="Verbesserungsvorschläge"
        items={report.editorial?.recommendations ?? []}
        tone="gray"
      />

      {writable && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ActionButton
            action={rewriteTextAction}
            fields={fields}
            label="Text überarbeiten"
          />
          {factRisk ? (
            <span className="text-xs text-red-600">
              Freigabe gesperrt – Faktenrisiko zuerst prüfen.
            </span>
          ) : (
            <ActionButton
              action={approveTextAction}
              fields={fields}
              label="Manuell freigeben"
              variant="primary"
            />
          )}
          <ActionButton
            action={rejectTextAction}
            fields={fields}
            label="Ablehnen"
            variant="danger"
            confirmText="Text wirklich ablehnen?"
          />
        </div>
      )}
    </Card>
  );
}
