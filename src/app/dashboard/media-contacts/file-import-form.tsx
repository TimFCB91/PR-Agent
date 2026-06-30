"use client";

import { useActionState } from "react";

import {
  importMediaContactsFileAction,
  type ImportState,
} from "@/actions/media-import";
import { Card, Label, Input, Select, Button } from "@/components/ui";

const initial: ImportState = { ok: false };

export function FileImportForm() {
  const [state, formAction, pending] = useActionState(
    importMediaContactsFileAction,
    initial,
  );

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">
        Kontakte importieren (CSV / Excel / Zimpel)
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        Spalten werden automatisch erkannt und auf Medienkontakte gemappt.
        Dubletten werden geprüft.
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="sourceType">Quelle</Label>
          <Select id="sourceType" name="sourceType">
            <option value="CSV">CSV</option>
            <option value="EXCEL">Excel</option>
            <option value="ZIMPEL">Zimpel-Export</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="onDuplicate">Bei Dubletten</Label>
          <Select id="onDuplicate" name="onDuplicate">
            <option value="skip">Dublette überspringen</option>
            <option value="update">Dublette aktualisieren</option>
            <option value="new">Trotzdem neu anlegen</option>
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="file">Datei</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
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
          {state.imported ?? 0} importiert, {state.updated ?? 0} aktualisiert,{" "}
          {state.skipped ?? 0} übersprungen, {state.duplicates ?? 0} Dubletten,{" "}
          {state.invalid ?? 0} ungültig.
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
