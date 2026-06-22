import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// The middleware only uses the edge-safe config (no Prisma/bcrypt). The
// `authorized` callback decides whether a request to a protected route is
// allowed and redirects unauthenticated users to the sign-in page.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except static assets and the auth API route.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
