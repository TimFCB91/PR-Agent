"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import {
  Card,
  Input,
  Label,
  Textarea,
  Select,
  Button,
  LinkButton,
  FieldError,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface MediaContactFormValues {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  outlet?: string | null;
  beat?: string | null;
  notes?: string | null;
  priority?: string | null;
  relationship?: string | null;
  doNotContact?: boolean | null;
}

export function MediaContactForm({
  action,
  defaults,
  submitLabel,
}: {
  action: Action;
  defaults?: MediaContactFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Vorname *</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={defaults?.firstName ?? ""}
              required
            />
            <FieldError messages={state.fieldErrors?.firstName} />
          </div>
          <div>
            <Label htmlFor="lastName">Nachname *</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={defaults?.lastName ?? ""}
              required
            />
            <FieldError messages={state.fieldErrors?.lastName} />
          </div>
        </div>
        <div>
          <Label htmlFor="email">E-Mail *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults?.email ?? ""}
            required
          />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="outlet">Medium / Redaktion</Label>
            <Input
              id="outlet"
              name="outlet"
              defaultValue={defaults?.outlet ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="beat">Ressort / Thema</Label>
            <Input id="beat" name="beat" defaultValue={defaults?.beat ?? ""} />
          </div>
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="notes">Notizen</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={defaults?.notes ?? ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priority">Priorität</Label>
            <Select
              id="priority"
              name="priority"
              defaultValue={defaults?.priority ?? "B"}
            >
              <option value="A">A (Top-Kontakt, individuell)</option>
              <option value="B">B (teilpersonalisiert)</option>
              <option value="C">C (standardisiert)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="relationship">Beziehung</Label>
            <Select
              id="relationship"
              name="relationship"
              defaultValue={defaults?.relationship ?? "NORMAL"}
            >
              <option value="NORMAL">Normal</option>
              <option value="GOLD">Goldkontakt</option>
              <option value="BLACKLIST">Blacklist</option>
            </Select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="doNotContact"
            defaultChecked={defaults?.doNotContact ?? false}
          />
          Nicht erneut kontaktieren (von Follow-ups ausschließen)
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : submitLabel}
          </Button>
          <LinkButton href="/dashboard/media-contacts" variant="secondary">
            Abbrechen
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
