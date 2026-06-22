"use client";

import { useActionState } from "react";

import type { RawFileImportState } from "@/actions/raw-inputs";
import { emptyFormState } from "@/lib/form";
import { Label, Input, Select, Button } from "@/components/ui";

type Action = (
  prev: RawFileImportState,
  formData: FormData,
) => Promise<RawFileImportState>;

const SOURCE_TYPES = [
  "BRIEFING",
  "NOTE",
  "PRESSKIT",
  "WEBSITE",
  "TRANSCRIPT",
  "EMAIL",
  "SOCIAL",
  "OTHER",
] as const;

export function RawFileImportForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(
    action,
    emptyFormState as RawFileImportState,
  );

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-900">Datei hochladen</p>
      <p className="mt-1 text-xs text-gray-500">
        PDF, Word (.docx) oder Text (.txt/.md/.csv). Der Text wird automatisch
        ausgelesen und als Rohinformation gespeichert. Danach „Wissen aufbauen".
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="fileSourceType">Quelle / Art</Label>
          <Select id="fileSourceType" name="sourceType" defaultValue="BRIEFING">
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Label htmlFor="rawFile">Datei</Label>
          <Input
            id="rawFile"
            name="file"
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv,application/pdf,text/plain"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Lese aus…" : "Hochladen"}
        </Button>
      </form>

      {state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && state.fileName && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          „{state.fileName}" importiert ({state.chars ?? 0} Zeichen). Jetzt im
          Tab „Wissen" auf „Wissen aufbauen" klicken.
        </p>
      )}
    </div>
  );
}
