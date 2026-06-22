"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import { Input, Label, Textarea, Select, Button, FieldError } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = ["DRAFT", "APPROVED", "PITCHED", "ARCHIVED"] as const;

export function TopicForm({
  action,
  campaigns,
}: {
  action: Action;
  campaigns: Array<{ id: string; name: string }>;
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
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={3} />
        <FieldError messages={state.fieldErrors?.description} />
      </div>
      <div>
        <Label htmlFor="mediaAngle">Medien-Aufhänger</Label>
        <Input id="mediaAngle" name="mediaAngle" />
        <FieldError messages={state.fieldErrors?.mediaAngle} />
      </div>
      <div>
        <Label htmlFor="targetMediaType">Ziel-Medientyp</Label>
        <Input id="targetMediaType" name="targetMediaType" />
        <FieldError messages={state.fieldErrors?.targetMediaType} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="searchPotential">Suchpotenzial</Label>
          <Select id="searchPotential" name="searchPotential" defaultValue="MEDIUM">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="newsValue">Nachrichtenwert</Label>
          <Select id="newsValue" name="newsValue" defaultValue="MEDIUM">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priorität</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
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
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Anlegen"}
      </Button>
    </form>
  );
}
