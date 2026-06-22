"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const SOURCE_TYPES = [
  "NOTE",
  "WEBSITE",
  "TRANSCRIPT",
  "EMAIL",
  "BRIEFING",
  "SOCIAL",
  "PRESSKIT",
  "OTHER",
] as const;

const STATUSES = ["NEW", "PROCESSED", "NEEDS_REVIEW", "ARCHIVED"] as const;

export function RawInputForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" name="title" required />
        <FieldError messages={state.fieldErrors?.title} />
      </div>
      <div>
        <Label htmlFor="sourceType">Quelle</Label>
        <Select id="sourceType" name="sourceType" defaultValue="NOTE">
          {SOURCE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <FieldError messages={state.fieldErrors?.sourceType} />
      </div>
      <div>
        <Label htmlFor="rawText">Text</Label>
        <Textarea id="rawText" name="rawText" rows={4} />
        <FieldError messages={state.fieldErrors?.rawText} />
      </div>
      <div>
        <Label htmlFor="fileName">Dateiname</Label>
        <Input id="fileName" name="fileName" />
        <FieldError messages={state.fieldErrors?.fileName} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue="NEW">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <FieldError messages={state.fieldErrors?.status} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Anlegen"}
      </Button>
    </form>
  );
}
