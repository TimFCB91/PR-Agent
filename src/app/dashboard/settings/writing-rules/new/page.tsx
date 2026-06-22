import { requireTenant, canWrite } from "@/lib/tenant";
import { redirect } from "next/navigation";

import { createWritingRuleSetAction } from "@/actions/writing-rules";
import { PageHeader } from "@/components/ui";
import { WritingRuleForm } from "../writing-rule-form";

export default async function NewWritingRulePage() {
  const { role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/settings/writing-rules");

  return (
    <div>
      <PageHeader title="Neues Regelwerk" />
      <WritingRuleForm
        action={createWritingRuleSetAction}
        submitLabel="Anlegen"
      />
    </div>
  );
}
