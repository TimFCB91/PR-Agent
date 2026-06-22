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

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const;

function toDateInput(value?: Date | string | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export interface CampaignFormValues {
  name?: string;
  description?: string | null;
  status?: string;
  clientId?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export function CampaignForm({
  action,
  clients,
  defaults,
  submitLabel,
}: {
  action: Action;
  clients: Array<{ id: string; name: string }>;
  defaults?: CampaignFormValues;
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
          <Label htmlFor="clientId">Kunde *</Label>
          <Select
            id="clientId"
            name="clientId"
            defaultValue={defaults?.clientId ?? ""}
            required
          >
            <option value="" disabled>
              Kunde wählen…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError messages={state.fieldErrors?.clientId} />
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={toDateInput(defaults?.startDate)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Ende</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={toDateInput(defaults?.endDate)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={defaults?.description ?? ""}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : submitLabel}
          </Button>
          <LinkButton href="/dashboard/campaigns" variant="secondary">
            Abbrechen
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
