"use client";

import { useActionState } from "react";

import type { KnowledgeBuildState } from "@/actions/ai";
import { Button } from "@/components/ui";

type Action = (
  prev: KnowledgeBuildState,
  formData: FormData,
) => Promise<KnowledgeBuildState>;

const initial: KnowledgeBuildState = { ok: false };

export function KnowledgeRebuildButton({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Baue Wissen per KI auf…" : "🔄 Wissen per KI neu aufbauen"}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" name="wipeManual" value="true" />
          auch manuell angelegte Einträge ersetzen
        </label>
      </form>
      <p className="text-xs text-gray-400">
        Liest alle Rohinformationen/Dokumente neu ein und erzeugt das Wissen
        komplett neu. Nutze das auch, wenn du an anderer Stelle etwas ergänzt
        oder aktualisiert hast.
      </p>
      {pending && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Die KI liest gerade die Dokumente – das kann einige Sekunden dauern.
        </p>
      )}
      {!pending && state.error && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.error}
        </p>
      )}
      {!pending && state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          ✅ {state.created ?? 0} Wissens-Einträge per KI neu erstellt.
        </p>
      )}
    </div>
  );
}
