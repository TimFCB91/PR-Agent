"use client";

import { useActionState } from "react";

import { emptyFormState, type FormState } from "@/lib/form";
import {
  Card,
  Input,
  Label,
  Textarea,
  Button,
  LinkButton,
  FieldError,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function WritingRuleForm({
  action,
  defaults,
  submitLabel,
}: {
  action: Action;
  defaults?: {
    name?: string;
    description?: string | null;
    rules?: string | null;
    forbiddenPhrases?: string[];
    preferredStructure?: string | null;
    toneOfVoice?: string | null;
    minWords?: number | null;
    maxWords?: number | null;
  };
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
          <Input
            id="name"
            name="name"
            defaultValue={defaults?.name ?? ""}
            required
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={defaults?.description ?? ""}
          />
          <FieldError messages={state.fieldErrors?.description} />
        </div>
        <div>
          <Label htmlFor="rules">Regeln</Label>
          <Textarea
            id="rules"
            name="rules"
            rows={5}
            defaultValue={defaults?.rules ?? ""}
          />
          <FieldError messages={state.fieldErrors?.rules} />
        </div>
        <div>
          <Label htmlFor="forbiddenPhrases">
            Verbotene Begriffe (einer pro Zeile)
          </Label>
          <Textarea
            id="forbiddenPhrases"
            name="forbiddenPhrases"
            rows={4}
            defaultValue={defaults?.forbiddenPhrases?.join("\n") ?? ""}
          />
          <FieldError messages={state.fieldErrors?.forbiddenPhrases} />
        </div>
        <div>
          <Label htmlFor="preferredStructure">Bevorzugte Struktur</Label>
          <Textarea
            id="preferredStructure"
            name="preferredStructure"
            rows={4}
            defaultValue={defaults?.preferredStructure ?? ""}
          />
          <FieldError messages={state.fieldErrors?.preferredStructure} />
        </div>
        <div>
          <Label htmlFor="toneOfVoice">Tonalität</Label>
          <Input
            id="toneOfVoice"
            name="toneOfVoice"
            defaultValue={defaults?.toneOfVoice ?? ""}
          />
          <FieldError messages={state.fieldErrors?.toneOfVoice} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minWords">Min. Wortzahl</Label>
            <Input
              id="minWords"
              name="minWords"
              type="number"
              defaultValue={defaults?.minWords ?? ""}
            />
            <FieldError messages={state.fieldErrors?.minWords} />
          </div>
          <div>
            <Label htmlFor="maxWords">Max. Wortzahl</Label>
            <Input
              id="maxWords"
              name="maxWords"
              type="number"
              defaultValue={defaults?.maxWords ?? ""}
            />
            <FieldError messages={state.fieldErrors?.maxWords} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : submitLabel}
          </Button>
          <LinkButton
            href="/dashboard/settings/writing-rules"
            variant="secondary"
          >
            Abbrechen
          </LinkButton>
        </div>
      </form>
    </Card>
  );
}
