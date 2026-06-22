"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const CATEGORIES = [
  "POSITIONING",
  "EXPERTISE",
  "TARGET_GROUP",
  "PROOF_POINT",
  "QUOTE",
  "REFERENCE",
  "TOPIC_FIELD",
  "MEDIA_ANGLE",
  "NO_GO",
  "RISK",
  "FAQ",
  "COMPETITOR",
  "OTHER",
] as const;

export type KnowledgeDefaults = {
  category?: string | null;
  title?: string | null;
  content?: string | null;
  confidence?: number | null;
};

export function KnowledgeForm({
  action,
  defaults,
  submitLabel = "Anlegen",
}: {
  action: Action;
  defaults?: KnowledgeDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="category">Kategorie</Label>
        <Select
          id="category"
          name="category"
          defaultValue={defaults?.category ?? "POSITIONING"}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <FieldError messages={state.fieldErrors?.category} />
      </div>
      <div>
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" name="title" required defaultValue={defaults?.title ?? ""} />
        <FieldError messages={state.fieldErrors?.title} />
      </div>
      <div>
        <Label htmlFor="content">Inhalt</Label>
        <Textarea
          id="content"
          name="content"
          rows={4}
          defaultValue={defaults?.content ?? ""}
        />
        <FieldError messages={state.fieldErrors?.content} />
      </div>
      <div>
        <Label htmlFor="confidence">Konfidenz (0-100)</Label>
        <Input
          id="confidence"
          name="confidence"
          type="number"
          min={0}
          max={100}
          defaultValue={defaults?.confidence ?? 70}
        />
        <FieldError messages={state.fieldErrors?.confidence} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
