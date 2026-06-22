import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: Role;
}

/**
 * Returns the current tenant context (user + organization + role) or redirects
 * to the login page when no valid session exists.
 *
 * This is the single source of truth for the organizationId that every
 * database query MUST be scoped to. Server components and server actions
 * should call this before touching tenant-owned data.
 */
export async function requireTenant(): Promise<TenantContext> {
  const session = await auth();

  if (!session?.user?.organizationId) {
    redirect("/login");
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role,
  };
}

const WRITE_ROLES: Role[] = ["OWNER", "ADMIN", "EDITOR"];
const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export function canWrite(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export function canAdminister(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

/** Thrown by server actions when the current role lacks write permission. */
export class AccessDeniedError extends Error {
  constructor(message = "Keine Berechtigung für diese Aktion.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/** Ensures the current tenant may modify data; throws otherwise. */
export async function requireWriteAccess(): Promise<TenantContext> {
  const tenant = await requireTenant();
  if (!canWrite(tenant.role)) {
    throw new AccessDeniedError();
  }
  return tenant;
}
