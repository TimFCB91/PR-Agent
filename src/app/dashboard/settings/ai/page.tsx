import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getAIConfig } from "@/lib/ai/config";
import { Card, PageHeader, LinkButton, EmptyState, Badge } from "@/components/ui";

export default async function AISettingsPage() {
  const { organizationId } = await requireTenant();
  const cfg = getAIConfig();

  const logs = await prisma.aIUsageLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="AI"
        description="Modus, Provider und Nutzungs-Log der KI-Agenten"
        action={
          <LinkButton href="/dashboard/settings" variant="secondary">
            Zurück zu Einstellungen
          </LinkButton>
        }
      />

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-900">Konfiguration</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Modus</dt>
            <dd className="font-medium text-gray-900">
              <Badge value={cfg.mode === "real" ? "REAL" : "MOCK"} />
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Provider</dt>
            <dd className="font-medium text-gray-900">{cfg.provider}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Modell</dt>
            <dd className="font-medium text-gray-900">{cfg.model}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-500">
          Umschaltbar über die Umgebungsvariablen AI_MODE und AI_PROVIDER (siehe
          README). Im Mock-Modus werden keine externen KI-Dienste aufgerufen.
        </p>
      </Card>

      <div className="mt-6">
        {logs.length === 0 ? (
          <EmptyState message="Noch keine KI-Aufrufe protokolliert." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Zeitpunkt</th>
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 font-medium">Modus</th>
                  <th className="px-5 py-3 font-medium">Provider</th>
                  <th className="px-5 py-3 font-medium">Modell</th>
                  <th className="px-5 py-3 font-medium">Tokens</th>
                  <th className="px-5 py-3 font-medium">Dauer</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Benutzer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600">
                      {l.createdAt.toLocaleString("de-DE")}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {l.agent}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={l.mode.toUpperCase()} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{l.provider}</td>
                    <td className="px-5 py-3 text-gray-600">{l.model ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {`${l.inputTokens ?? 0}/${l.outputTokens ?? 0}`}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {`${l.latencyMs ?? 0} ms`}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={l.success ? "OK" : "FEHLER"} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {l.user?.name ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
