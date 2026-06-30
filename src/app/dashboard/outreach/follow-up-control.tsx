"use client";

import { generateFollowUpViaAgentAction } from "@/actions/ai";
import { Button, Select } from "@/components/ui";

export function FollowUpControl({ outreachId }: { outreachId: string }) {
  return (
    <form
      action={generateFollowUpViaAgentAction}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={outreachId} />
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
