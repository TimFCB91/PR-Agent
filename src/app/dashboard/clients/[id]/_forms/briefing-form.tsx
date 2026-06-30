"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const STATUSES = ["DRAFT", "APPROVED", "DELIVERED"] as const;

export type BriefingDefaults = {
  title?: string | null;
  targetAudience?: string | null;
  angle?: string | null;
  keyMessages?: string | null;
  suggestedStructure?: string | null;
  expertContext?: string | null;
  noGos?: string | null;
  status?: string | null;
  campaignId?: string | null;
  topicIdeaId?: string | null;
  mediaContactId?: string | null;
};

export function BriefingForm({
  action,
  campaigns,
  topics,
  contacts,
  defaults,
  submitLabel = "Anlegen",
}: {
  action: Action;
  campaigns: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; title: string }>;
  contacts: Array<{ id: string; firstName: string; lastName: string }>;
  defaults?: BriefingDefaults;
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
        <Label htmlFor="title">Titel *</Label>
        <Input id="title" name="title" required defaultValue={defaults?.title ?? ""} />
        <FieldError messages={state.fieldErrors?.title} />
      </div>
      <div>
        <Label htmlFor="targetAudience">Zielgruppe</Label>
        <Input
          id="targetAudience"
          name="targetAudience"
          defaultValue={defaults?.targetAudience ?? ""}
        />
        <FieldError messages={state.fieldErrors?.targetAudience} />
      </div>
      <div>
        <Label htmlFor="angle">Aufhänger</Label>
        <Input id="angle" name="angle" defaultValue={defaults?.angle ?? ""} />
        <FieldError messages={state.fieldErrors?.angle} />
      </div>
      <div>
        <Label htmlFor="keyMessages">Kernbotschaften</Label>
        <Textarea
          id="keyMessages"
          name="keyMessages"
          rows={3}
          defaultValue={defaults?.keyMessages ?? ""}
        />
        <FieldError messages={state.fieldErrors?.keyMessages} />
      </div>
      <div>
        <Label htmlFor="suggestedStructure">Struktur-Vorschlag</Label>
        <Textarea
          id="suggestedStructure"
          name="suggestedStructure"
          rows={3}
          defaultValue={defaults?.suggestedStructure ?? ""}
        />
        <FieldError messages={state.fieldErrors?.suggestedStructure} />
      </div>
      <div>
        <Label htmlFor="expertContext">Experten-Kontext</Label>
        <Textarea
          id="expertContext"
          name="expertContext"
          rows={3}
          defaultValue={defaults?.expertContext ?? ""}
        />
        <FieldError messages={state.fieldErrors?.expertContext} />
      </div>
      <div>
        <Label htmlFor="noGos">No-Gos</Label>
        <Textarea
          id="noGos"
          name="noGos"
          rows={2}
          defaultValue={defaults?.noGos ?? ""}
        />
        <FieldError messages={state.fieldErrors?.noGos} />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={defaults?.status ?? "DRAFT"}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="campaignId">Kampagne</Label>
        <Select
          id="campaignId"
          name="campaignId"
          defaultValue={defaults?.campaignId ?? ""}
        >
          <option value="">— keine —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="topicIdeaId">Thema</Label>
        <Select
          id="topicIdeaId"
          name="topicIdeaId"
          defaultValue={defaults?.topicIdeaId ?? ""}
        >
          <option value="">— keine —</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="mediaContactId">Medienkontakt</Label>
        <Select
          id="mediaContactId"
          name="mediaContactId"
          defaultValue={defaults?.mediaContactId ?? ""}
        >
          <option value="">— keine —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
