import type { NextAuthConfig, Session } from "next-auth";

// Edge-safe Auth.js configuration. This file must NOT import Prisma, bcrypt,
// or any Node-only module so it can be used inside the middleware (edge
// runtime). The Credentials provider with database access lives in auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    // Gatekeeper used by the middleware to protect the dashboard.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        return isLoggedIn;
      }
      return true;
    },
    // Persist tenant context on the token at sign-in.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }
      return token;
    },
    // Expose tenant context on the session object.
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as Session["user"]["role"];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
