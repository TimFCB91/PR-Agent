"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SENT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export function ArticleForm({
  action,
  campaigns,
  briefings,
}: {
  action: Action;
  campaigns: Array<{ id: string; name: string }>;
  briefings: Array<{ id: string; title: string }>;
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
        <Label htmlFor="subtitle">Untertitel</Label>
        <Input id="subtitle" name="subtitle" />
        <FieldError messages={state.fieldErrors?.subtitle} />
      </div>
      <div>
        <Label htmlFor="articleText">Artikeltext</Label>
        <Textarea id="articleText" name="articleText" rows={5} />
        <FieldError messages={state.fieldErrors?.articleText} />
      </div>
      <div>
        <Label htmlFor="metaDescription">Meta-Beschreibung</Label>
        <Input id="metaDescription" name="metaDescription" />
        <FieldError messages={state.fieldErrors?.metaDescription} />
      </div>
      <div>
        <Label htmlFor="targetMedium">Ziel-Medium</Label>
        <Input id="targetMedium" name="targetMedium" />
        <FieldError messages={state.fieldErrors?.targetMedium} />
      </div>
      <div>
        <Label htmlFor="targetAudience">Zielgruppe</Label>
        <Input id="targetAudience" name="targetAudience" />
        <FieldError messages={state.fieldErrors?.targetAudience} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue="DRAFT">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
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
        <Label htmlFor="briefingId">Briefing</Label>
        <Select id="briefingId" name="briefingId" defaultValue="">
          <option value="">— keine —</option>
          {briefings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
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
