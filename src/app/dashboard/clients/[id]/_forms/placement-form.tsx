"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const STATES = [
  { value: "OPEN", label: "Offen" },
  { value: "ACCEPTED", label: "Zusage (wartet auf Veröffentlichung)" },
  { value: "PUBLISHED", label: "Veröffentlicht" },
  { value: "REJECTED", label: "Abgesagt / abgelehnt" },
] as const;

export type PlacementDefaults = {
  position?: number | null;
  type?: string | null;
  state?: string | null;
  medium?: string | null;
  contactEmail?: string | null;
  publicationUrl?: string | null;
  note?: string | null;
};

export function PlacementForm({
  action,
  defaults,
  submitLabel = "Anlegen",
}: {
  action: Action;
  defaults?: PlacementDefaults;
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
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="position">Nr.</Label>
          <Input
            id="position"
            name="position"
            type="number"
            min={1}
            defaultValue={defaults?.position ?? ""}
          />
          <FieldError messages={state.fieldErrors?.position} />
        </div>
        <div>
          <Label htmlFor="type">Art (z. B. GZ, IZ, P)</Label>
          <Input id="type" name="type" defaultValue={defaults?.type ?? ""} />
        </div>
        <div>
          <Label htmlFor="state">Status</Label>
          <Select id="state" name="state" defaultValue={defaults?.state ?? "OPEN"}>
            {STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="medium">Medium</Label>
          <Input id="medium" name="medium" defaultValue={defaults?.medium ?? ""} />
        </div>
        <div>
          <Label htmlFor="contactEmail">Kontakt-E-Mail</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            defaultValue={defaults?.contactEmail ?? ""}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="publicationUrl">Veröffentlichungs-Link</Label>
        <Input
          id="publicationUrl"
          name="publicationUrl"
          defaultValue={defaults?.publicationUrl ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="note">Notiz</Label>
        <Input id="note" name="note" defaultValue={defaults?.note ?? ""} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
