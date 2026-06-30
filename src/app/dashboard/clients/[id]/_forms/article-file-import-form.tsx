"use client";

import { useActionState } from "react";

import type { ArticleFileImportState } from "@/actions/articles";
import { Card, Label, Input, Select, Button } from "@/components/ui";

type Action = (
  prev: ArticleFileImportState,
  formData: FormData,
) => Promise<ArticleFileImportState>;

const initial: ArticleFileImportState = { ok: false };

export function ArticleFileImportForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-gray-900">
        Fertigen Artikel hochladen (Word / PDF / Text)
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Für bereits geschriebene Texte (die rohe Datei vor dem VÖ-Link). Der
        komplette Text wird ausgelesen und als Artikel hinterlegt. Die erste
        Zeile wird als Titel verwendet.
      </p>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <Label htmlFor="articleFile">Datei</Label>
          <Input
            id="articleFile"
            name="file"
            type="file"
            accept=".docx,.doc,.pdf,.txt,.md"
            required
          />
        </div>
        <div className="min-w-[10rem]">
          <Label htmlFor="articleTargetMedium">Medium (optional)</Label>
          <Input
            id="articleTargetMedium"
            name="targetMedium"
            placeholder="z. B. FOCUS Online"
          />
        </div>
        <div className="min-w-[9rem]">
          <Label htmlFor="articleStatus">Status</Label>
          <Select id="articleStatus" name="status" defaultValue="PUBLISHED">
            <option value="PUBLISHED">Veröffentlicht</option>
            <option value="SENT">Eingereicht</option>
            <option value="APPROVED">Freigegeben</option>
            <option value="REVIEW">In Review</option>
            <option value="DRAFT">Entwurf</option>
            <option value="ARCHIVED">Archiviert</option>
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Lade hoch…" : "Hochladen"}
        </Button>
      </form>
      {state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          „{state.fileName}" importiert ({state.chars ?? 0} Zeichen Text
          hinterlegt).
        </p>
      )}
    </Card>
  );
}
