import {
  requireWriteAccess,
  AccessDeniedError,
  type TenantContext,
} from "@/lib/tenant";
import type { FormState } from "@/lib/form";

export type WriteAccessResult =
  | { tenant: TenantContext; errorState?: undefined }
  | { tenant?: undefined; errorState: FormState };

/**
 * Resolves the write-capable tenant context, or returns a FormState error if
 * the current role is read-only. Keeps server actions free of repeated
 * try/catch boilerplate.
 *
 * Usage:
 *   const acc = await writeAccess();
 *   if (acc.errorState) return acc.errorState;
 *   const { tenant } = acc;
 */
export async function writeAccess(): Promise<WriteAccessResult> {
  try {
    return { tenant: await requireWriteAccess() };
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return { errorState: { ok: false, error: e.message } };
    }
    throw e;
  }
}
