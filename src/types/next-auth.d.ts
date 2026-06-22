import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Augment the Auth.js session and JWT so the tenant context (organizationId
// and role) is available everywhere the session is read.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId: string;
    role: Role;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    organizationId: string;
    role: Role;
  }
}
