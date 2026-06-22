"use client";

import { Button } from "@/components/ui";

// Inline form that posts an id to a delete server action, with a confirm
// prompt. Hidden entirely for read-only roles.
export function DeleteButton({
  id,
  action,
  label = "Löschen",
  confirmText = "Wirklich löschen?",
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" className="px-3 py-1 text-xs">
        {label}
      </Button>
    </form>
  );
}
