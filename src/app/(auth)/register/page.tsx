"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction } from "@/actions/auth";
import { emptyFormState } from "@/lib/form";
import {
  Card,
  Input,
  Label,
  Button,
  FieldError,
} from "@/components/ui";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    emptyFormState,
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Organisation anlegen</h2>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <div>
          <Label htmlFor="organizationName">Organisation</Label>
          <Input id="organizationName" name="organizationName" required />
          <FieldError messages={state.fieldErrors?.organizationName} />
        </div>
        <div>
          <Label htmlFor="name">Ihr Name</Label>
          <Input id="name" name="name" required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError messages={state.fieldErrors?.email} />
        </div>
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Wird angelegt…" : "Organisation anlegen"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Bereits registriert?{" "}
        <Link href="/login" className="font-medium text-gray-900 underline">
          Anmelden
        </Link>
      </p>
    </Card>
  );
}
