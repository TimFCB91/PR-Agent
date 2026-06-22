"use client";

import { useActionState } from "react";

import {
  importTrelloTopicsAction,
  type PoolImportState,
} from "@/actions/topic-pool";
import { Card, Label, Input, Button } from "@/components/ui";

const initial: PoolImportState = { ok: false };

export function TrelloImportForm() {
  const [state, formAction, pending] = useActionState(
    importTrelloTopicsAction,
    initial,
  );

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">
        Themen aus Trello importieren (JSON)
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        In Trello: Board → Menü → „Mehr" → „Drucken und Exportieren" → „JSON
        exportieren". Jede offene Karte wird zu einem Thema (Titel = Kartenname,
        Beschreibung + Liste + Labels werden übernommen).
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="file">Trello-JSON-Datei</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".json,application/json"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Importiere…" : "Importieren"}
        </Button>
      </form>

      {state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.imported ?? 0} Themen importiert.
        </p>
      )}
    </Card>
  );
}
