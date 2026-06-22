import { getSourceRefs, type SourceEntityType } from "@/lib/knowledge/sources";
import { Badge } from "@/components/ui";

/**
 * Shows the knowledge sources an agent actually used for a produced entity
 * (topic, pitch, briefing, article …) — making outputs traceable. Renders
 * nothing if no sources were recorded.
 */
export async function KnowledgeSources({
  entityType,
  entityId,
  organizationId,
}: {
  entityType: SourceEntityType;
  entityId: string;
  organizationId: string;
}) {
  const refs = await getSourceRefs(entityType, entityId, organizationId);
  if (refs.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700">
        Verwendete Quellen ({refs.length})
      </p>
      <ul className="mt-1 space-y-1">
        {refs.map((r) => (
          <li key={r.id} className="flex items-start gap-2 text-xs text-gray-600">
            {r.sourceType && <Badge value={r.sourceType} />}
            <span className="truncate">{r.shortExcerpt ?? r.documentId}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
