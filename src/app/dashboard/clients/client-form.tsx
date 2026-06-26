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

function toDateInput(value?: Date | string | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export interface ClientFormValues {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  notes?: string | null;
  package?: string | null;
  responsiblePerson?: string | null;
  onboardingDate?: Date | string | null;
  placementGoal?: number | null;
  tier?: string | null;
  status?: string | null;
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

        {/* Account management — fills the master overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="package">Paket / Leistung</Label>
            <Input
              id="package"
              name="package"
              placeholder="z. B. Online Medien Boost"
              defaultValue={defaults?.package ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="responsiblePerson">Zuständig</Label>
            <Input
              id="responsiblePerson"
              name="responsiblePerson"
              placeholder="z. B. Petra"
              defaultValue={defaults?.responsiblePerson ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="onboardingDate">Onboarding-Datum</Label>
            <Input
              id="onboardingDate"
              name="onboardingDate"
              type="date"
              defaultValue={toDateInput(defaults?.onboardingDate)}
            />
          </div>
          <div>
            <Label htmlFor="placementGoal">Zusagenziel</Label>
            <Input
              id="placementGoal"
              name="placementGoal"
              type="number"
              min={0}
              placeholder="z. B. 10"
              defaultValue={defaults?.placementGoal ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="tier">Stufe</Label>
            <Select id="tier" name="tier" defaultValue={defaults?.tier ?? ""}>
              <option value="">—</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={defaults?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAUSED">Pausiert</option>
            <option value="ENDED">Beendet</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
