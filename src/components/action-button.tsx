"use client";

import { Button } from "@/components/ui";

type Variant = "primary" | "secondary" | "danger";

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
      <Button type="submit" variant={variant} className="px-3 py-1 text-xs">
        {label}
      </Button>
    </form>
  );
}
