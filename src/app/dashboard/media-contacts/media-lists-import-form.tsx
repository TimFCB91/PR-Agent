"use client";

import { useActionState } from "react";

import {
  importMediaListsAction,
  type MediaListsImportState,
} from "@/actions/media-lists-import";
import { Card, Label, Input, Button } from "@/components/ui";

const initial: MediaListsImportState = { ok: false };

export function MediaListsImportForm() {
  const [state, formAction, pending] = useActionState(
    importMediaListsAction,
    initial,
  );

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">
        Eigene Medienlisten importieren (Medienfreunde / Podcaster / Radiosender)
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        Lädt die Blätter „Medienfreunde A–M / N–Z", „Podcaster" und
        „Radiosender" aus deiner Excel. E-Mail/Telefon werden aus den Notizen
        erkannt; Kosten, Links und Notizen bleiben erhalten. Bereits vorhandene
        Kontakte werden übersprungen.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="mediaListsFile">Excel-Datei (.xlsx)</Label>
          <Input
            id="mediaListsFile"
            name="file"
            type="file"
            accept=".xlsx,.xls"
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
          {state.imported ?? 0} Medienkontakte importiert, {state.skipped ?? 0}{" "}
          bereits vorhanden. Gesamt erkannt: {state.total ?? 0}.
        </p>
      )}
    </Card>
  );
}
