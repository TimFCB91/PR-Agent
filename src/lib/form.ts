// Shared shape returned by server actions used with useActionState.
export interface FormState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export const emptyFormState: FormState = { ok: false };

import type { ZodError } from "zod";

export function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
