"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/actions/auth";
import { emptyFormState } from "@/lib/form";
import {
  Card,
  Input,
  Label,
  Button,
  FieldError,
} from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    emptyFormState,
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Anmelden</h2>
      <form action={formAction} className="space-y-4">
        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
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
            autoComplete="current-password"
            required
          />
          <FieldError messages={state.fieldErrors?.password} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Anmelden…" : "Anmelden"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-medium text-gray-900 underline">
          Organisation anlegen
        </Link>
      </p>
    </Card>
  );
}
