"use client";

import { useActionState } from "react";

import { importMediaContactsAction, type ImportState } from "@/actions/media-contacts-import";
import { Card, Label, Input, Button } from "@/components/ui";

const initial: ImportState = { ok: false };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importMediaContactsAction,
    initial,
  );

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">CSV-Import</h2>
      <p className="mt-1 text-xs text-gray-500">
        Erwartete Spalten (Kopfzeile):{" "}
        <code className="rounded bg-gray-100 px-1">
          firstName,lastName,email,phone,outlet,beat,notes
        </code>
      </p>

      <form action={formAction} className="mt-4 flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="file">CSV-Datei</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv"
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
        <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.imported} Kontakt(e) importiert
          {state.skipped ? `, ${state.skipped} übersprungen` : ""}.
          {state.rowErrors && state.rowErrors.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-green-900">
              {state.rowErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
