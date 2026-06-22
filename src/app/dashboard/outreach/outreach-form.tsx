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

const STATUSES = [
  "DRAFT",
  "READY",
  "SENT",
  "FOLLOW_UP_DUE",
  "INTERESTED",
  "ACCEPTED",
  "DECLINED",
  "ARTICLE_DELIVERED",
  "PUBLISHED",
] as const;

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
  pitchEmail?: string | null;
  followUpEmail?: string | null;
  lastContactDate?: Date | string | null;
  nextFollowUpDate?: Date | string | null;
  agreedTopic?: string | null;
  publicationUrl?: string | null;
  internalNotes?: string | null;
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
              defaultValue={defaults?.status ?? "DRAFT"}
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
            rows={4}
            defaultValue={defaults?.message ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="agreedTopic">Vereinbartes Thema</Label>
            <Input
              id="agreedTopic"
              name="agreedTopic"
              defaultValue={defaults?.agreedTopic ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="publicationUrl">Veröffentlichungs-URL</Label>
            <Input
              id="publicationUrl"
              name="publicationUrl"
              defaultValue={defaults?.publicationUrl ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lastContactDate">Letzter Kontakt</Label>
            <Input
              id="lastContactDate"
              name="lastContactDate"
              type="date"
              defaultValue={toDateInput(defaults?.lastContactDate)}
            />
          </div>
          <div>
            <Label htmlFor="nextFollowUpDate">Nächstes Follow-up</Label>
            <Input
              id="nextFollowUpDate"
              name="nextFollowUpDate"
              type="date"
              defaultValue={toDateInput(defaults?.nextFollowUpDate)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="pitchEmail">Pitch-E-Mail</Label>
          <Textarea
            id="pitchEmail"
            name="pitchEmail"
            rows={4}
            defaultValue={defaults?.pitchEmail ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="followUpEmail">Follow-up-E-Mail</Label>
          <Textarea
            id="followUpEmail"
            name="followUpEmail"
            rows={3}
            defaultValue={defaults?.followUpEmail ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="internalNotes">Interne Notizen</Label>
          <Textarea
            id="internalNotes"
            name="internalNotes"
            rows={3}
            defaultValue={defaults?.internalNotes ?? ""}
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
