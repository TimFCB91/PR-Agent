"use client";

import { useActionState } from "react";

import {
  updateProfileAction,
  updateOrganizationNameAction,
  updatePasswordAction,
} from "@/actions/profile";
import { emptyFormState } from "@/lib/form";
import { Card, Input, Label, Button, FieldError } from "@/components/ui";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; email: string };
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    emptyFormState,
  );

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">Mein Profil</h2>
      <form action={formAction} className="mt-4 space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Gespeichert.
          </p>
        )}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={defaults.name} required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="email">E-Mail (Login)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            required
          />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Profil speichern"}
        </Button>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    emptyFormState,
  );

  return (
    <Card className="mt-6 p-6">
      <h2 className="text-sm font-semibold text-gray-900">Passwort ändern</h2>
      <form action={formAction} className="mt-4 space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Passwort geändert.
          </p>
        )}
        <div>
          <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <FieldError messages={state.fieldErrors?.currentPassword} />
        </div>
        <div>
          <Label htmlFor="newPassword">Neues Passwort (mind. 8 Zeichen)</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError messages={state.fieldErrors?.newPassword} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError messages={state.fieldErrors?.confirmPassword} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Passwort ändern"}
        </Button>
      </form>
    </Card>
  );
}

export function OrganizationForm({ defaults }: { defaults: { name: string } }) {
  const [state, formAction, pending] = useActionState(
    updateOrganizationNameAction,
    emptyFormState,
  );

  return (
    <Card className="mt-6 p-6">
      <h2 className="text-sm font-semibold text-gray-900">Organisation</h2>
      <form action={formAction} className="mt-4 space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Gespeichert.
          </p>
        )}
        <div>
          <Label htmlFor="orgName">Name der Organisation / Agentur</Label>
          <Input id="orgName" name="name" defaultValue={defaults.name} required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Organisation speichern"}
        </Button>
      </form>
    </Card>
  );
}
