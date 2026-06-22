"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import {
  Card,
  Input,
  Label,
  Textarea,
  Button,
  LinkButton,
  FieldError,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface ClientFormValues {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  notes?: string | null;
}

export function ClientForm({
  action,
  defaults,
  submitLabel,
}: {
  action: Action;
  defaults?: ClientFormValues;
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
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" defaultValue={defaults?.name ?? ""} required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="contactEmail">Kontakt-E-Mail</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={defaults?.contactEmail ?? ""}
          />
          <FieldError messages={state.fieldErrors?.contactEmail} />
        </div>
        <div>
          <Label htmlFor="contactPhone">Telefon</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={defaults?.contactPhone ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={defaults?.website ?? ""}
          />
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
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : submitLabel}
          </Button>
          <LinkButton href="/dashboard/clients" variant="secondary">
            Abbrechen
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
