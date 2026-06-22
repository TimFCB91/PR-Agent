"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function PublicationForm({
  action,
  campaigns,
  contacts,
}: {
  action: Action;
  campaigns: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; firstName: string; lastName: string }>;
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
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" name="title" required />
        <FieldError messages={state.fieldErrors?.title} />
      </div>
      <div>
        <Label htmlFor="url">URL</Label>
        <Input id="url" name="url" />
        <FieldError messages={state.fieldErrors?.url} />
      </div>
      <div>
        <Label htmlFor="publicationDate">Veröffentlichungsdatum</Label>
        <Input id="publicationDate" name="publicationDate" type="date" />
        <FieldError messages={state.fieldErrors?.publicationDate} />
      </div>
      <div>
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" rows={3} />
        <FieldError messages={state.fieldErrors?.notes} />
      </div>
      <div>
        <Label htmlFor="campaignId">Kampagne</Label>
        <Select id="campaignId" name="campaignId" defaultValue="">
          <option value="">— keine —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="mediaContactId">Medienkontakt</Label>
        <Select id="mediaContactId" name="mediaContactId" defaultValue="">
          <option value="">— keine —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Anlegen"}
      </Button>
    </form>
  );
}
