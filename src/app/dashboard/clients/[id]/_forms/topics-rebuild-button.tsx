"use client";

import { useActionState } from "react";

import type { TopicsBuildState } from "@/actions/ai";
import { Button } from "@/components/ui";

type Action = (
  prev: TopicsBuildState,
  formData: FormData,
) => Promise<TopicsBuildState>;

const initial: TopicsBuildState = { ok: false };

export function TopicsRebuildButton({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Generiere Themen per KI…" : "🔄 Themen per KI neu generieren"}
        </Button>
      </form>
      <p className="text-xs text-gray-400">
        Erstellt die Themenideen aus dem aktuellen Wissen des Kunden neu.
        Bereits bearbeitete oder selbst angelegte Themen bleiben erhalten.
      </p>
      {pending && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Die KI entwickelt gerade Themenideen – das kann einige Sekunden dauern.
        </p>
      )}
      {!pending && state.error && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.error}
        </p>
      )}
      {!pending && state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          ✅ {state.created ?? 0} Themenideen per KI erstellt.
        </p>
      )}
    </div>
  );
}
