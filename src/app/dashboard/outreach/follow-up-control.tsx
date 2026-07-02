"use client";

import { generateFollowUpViaAgentAction } from "@/actions/ai";
import { Button, Select } from "@/components/ui";

export function FollowUpControl({
  outreachId,
  clientId,
}: {
  outreachId: string;
  clientId?: string;
}) {
  return (
    <form
      action={generateFollowUpViaAgentAction}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={outreachId} />
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <Select name="variant">
        <option value="THREE_DAYS">3 Tage</option>
        <option value="SEVEN_DAYS">7 Tage</option>
        <option value="ACCEPTED">Zusage</option>
        <option value="DECLINED">Absage</option>
      </Select>
      <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
        Follow-up
      </Button>
    </form>
  );
}
