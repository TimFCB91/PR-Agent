"use client";

import { useActionState } from "react";

import {
  importClientsExcelAction,
  type ClientsImportState,
} from "@/actions/clients-import";
import { Card, Label, Input, Button } from "@/components/ui";

const initial: ClientsImportState = { ok: false };

export function ClientsImportForm() {
  const [state, formAction, pending] = useActionState(
    importClientsExcelAction,
    initial,
  );

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">
        Kunden aus Excel importieren (KUNDEN-Tabelle)
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        Liest das Blatt „KUNDEN": Name, Stufe (A/B/C), Paket, Zuständig,
        Onboarding-Datum und Zusagenziel. Bereits vorhandene Kunden (gleicher
        Name) werden übersprungen – mehrfach ausführbar ohne Dubletten.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="clientsFile">Excel-Datei (.xlsx)</Label>
          <Input
            id="clientsFile"
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
          {state.imported ?? 0} Kunden importiert, {state.skipped ?? 0} bereits
          vorhanden (übersprungen). Gesamt erkannt: {state.total ?? 0}.
        </p>
      )}
    </Card>
  );
}
