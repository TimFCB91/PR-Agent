"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui";

type Variant = "primary" | "secondary" | "danger";

/** Submit button that reflects the enclosing form's pending state. */
function SubmitButton({ label, variant }: { label: string; variant: Variant }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className="px-3 py-1 text-xs"
    >
      {pending ? "Läuft…" : label}
    </Button>
  );
}

/**
 * Inline form that posts a set of hidden fields to a `void` server action.
 * Used for one-click workflow steps (generate, process, status change …).
 */
export function ActionButton({
  action,
  fields,
  label,
  variant = "secondary",
  confirmText,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  variant?: Variant;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton label={label} variant={variant} />
    </form>
  );
}
