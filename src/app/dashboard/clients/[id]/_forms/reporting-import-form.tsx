"use client";

import { useActionState } from "react";

import type { ReportingImportState } from "@/actions/placements";
import { Card, Label, Input, Button } from "@/components/ui";

type Action = (
  prev: ReportingImportState,
  formData: FormData,
) => Promise<ReportingImportState>;

const initial: ReportingImportState = { ok: false };

export function ReportingImportForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-gray-900">
        Reporting-Liste importieren (.xlsx)
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Liest das Blatt „Übersicht" (Nr./Medium/Typ/Status/Link) und erstellt
        daraus die Platzierungen. Das <strong>ersetzt</strong> die aktuellen
        Platzierungen dieses Kunden und setzt das Ziel auf die höchste Nr.
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="reportingFile">Reporting-Liste</Label>
          <Input
            id="reportingFile"
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
          {state.imported ?? 0} Platzierungen importiert (Ziel:{" "}
          {state.goal ?? 0}).
        </p>
      )}
    </Card>
  );
}
