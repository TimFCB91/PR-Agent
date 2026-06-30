import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenant, canWrite } from "@/lib/tenant";
import { updateWritingRuleSetAction } from "@/actions/writing-rules";
import { PageHeader } from "@/components/ui";
import { WritingRuleForm } from "../../writing-rule-form";

export default async function EditWritingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId, role } = await requireTenant();
  if (!canWrite(role)) redirect("/dashboard/settings/writing-rules");

  const ruleSet = await prisma.writingRuleSet.findFirst({
    where: { id, organizationId },
  });
  if (!ruleSet) notFound();

  const action = updateWritingRuleSetAction.bind(null, ruleSet.id);

  return (
    <div>
      <PageHeader title="Regelwerk bearbeiten" />
      <WritingRuleForm
        action={action}
        defaults={ruleSet}
        submitLabel="Speichern"
      />
    </div>
  );
}
