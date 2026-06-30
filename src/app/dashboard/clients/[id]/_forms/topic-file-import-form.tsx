"use client";

import { useActionState } from "react";

import type { TopicImportState } from "@/actions/ai";
import { Card, Label, Input, Button } from "@/components/ui";

type Action = (
  prev: TopicImportState,
  formData: FormData,
) => Promise<TopicImportState>;

const initial: TopicImportState = { ok: false };

export function TopicFileImportForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-gray-900">
        Themen aus Datei importieren (Word / PDF / Text)
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Lädt z. B. eine Themenvorschläge-Datei hoch; die KI zieht die darin
        genannten Themen heraus und legt sie als Themenideen an (sie werden beim
        „Neu generieren" nicht überschrieben).
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <Label htmlFor="topicFile">Datei</Label>
          <Input
            id="topicFile"
            name="file"
            type="file"
            accept=".docx,.doc,.pdf,.txt,.md"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Lese Themen aus…" : "Importieren"}
        </Button>
      </form>
      {pending && (
        <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Die KI liest die Datei – das kann einige Sekunden dauern.
        </p>
      )}
      {!pending && state.error && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {state.error}
        </p>
      )}
      {!pending && state.ok && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          ✅ {state.created ?? 0} Themen aus „{state.fileName}" importiert.
        </p>
      )}
    </Card>
  );
}
