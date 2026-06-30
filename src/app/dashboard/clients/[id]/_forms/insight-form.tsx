"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const INSIGHT_TYPES = [
  "POSITIONING",
  "EXPERTISE",
  "TARGET_GROUP",
  "PROOF_POINT",
  "QUOTE",
  "TOPIC_FIELD",
  "NO_GO",
  "RISK",
  "MISSING_INFO",
  "MEDIA_ANGLE",
] as const;

const STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;

export type InsightDefaults = {
  insightType?: string | null;
  title?: string | null;
  content?: string | null;
  confidence?: number | null;
  status?: string | null;
};

export function InsightForm({
  action,
  defaults,
  submitLabel = "Anlegen",
}: {
  action: Action;
  defaults?: InsightDefaults;
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
        <Label htmlFor="insightType">Typ</Label>
        <Select
          id="insightType"
          name="insightType"
          defaultValue={defaults?.insightType ?? "POSITIONING"}
        >
          {INSIGHT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <FieldError messages={state.fieldErrors?.insightType} />
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
          defaultValue={defaults?.confidence ?? 50}
        />
        <FieldError messages={state.fieldErrors?.confidence} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          name="status"
          defaultValue={defaults?.status ?? "DRAFT"}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <FieldError messages={state.fieldErrors?.status} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
