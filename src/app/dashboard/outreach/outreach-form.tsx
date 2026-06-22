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

const STATUSES = ["PLANNED", "SENT", "REPLIED", "DECLINED"] as const;

function toDateInput(value?: Date | string | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export interface OutreachFormValues {
  subject?: string;
  message?: string | null;
  status?: string;
  campaignId?: string;
  mediaContactId?: string;
  sentAt?: Date | string | null;
}

export function OutreachForm({
  action,
  campaigns,
  contacts,
  defaults,
  submitLabel,
}: {
  action: Action;
  campaigns: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; firstName: string; lastName: string }>;
  defaults?: OutreachFormValues;
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
          <Label htmlFor="subject">Betreff *</Label>
          <Input
            id="subject"
            name="subject"
            defaultValue={defaults?.subject ?? ""}
            required
          />
          <FieldError messages={state.fieldErrors?.subject} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="campaignId">Kampagne *</Label>
            <Select
              id="campaignId"
              name="campaignId"
              defaultValue={defaults?.campaignId ?? ""}
              required
            >
              <option value="" disabled>
                Kampagne wählen…
              </option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <FieldError messages={state.fieldErrors?.campaignId} />
          </div>
          <div>
            <Label htmlFor="mediaContactId">Medienkontakt *</Label>
            <Select
              id="mediaContactId"
              name="mediaContactId"
              defaultValue={defaults?.mediaContactId ?? ""}
              required
            >
              <option value="" disabled>
                Kontakt wählen…
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
            <FieldError messages={state.fieldErrors?.mediaContactId} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={defaults?.status ?? "PLANNED"}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sentAt">Versendet am</Label>
            <Input
              id="sentAt"
              name="sentAt"
              type="date"
              defaultValue={toDateInput(defaults?.sentAt)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="message">Nachricht</Label>
          <Textarea
            id="message"
            name="message"
            rows={5}
            defaultValue={defaults?.message ?? ""}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : submitLabel}
          </Button>
          <LinkButton href="/dashboard/outreach" variant="secondary">
            Abbrechen
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
