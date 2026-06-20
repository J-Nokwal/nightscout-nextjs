import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "crypto";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "admin" | "readable";
    };
  }
  interface User {
    role: "admin" | "readable";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        apiSecret: { label: "API Secret", type: "password" },
      },
      async authorize(credentials) {
        const secret = process.env.API_SECRET;
        if (!secret || !credentials?.apiSecret) return null;
        const hash = createHash("sha1").update(credentials.apiSecret as string).digest("hex");
        const expectedHash = createHash("sha1").update(secret).digest("hex");
        if (hash !== expectedHash) return null;
        return { id: "admin", name: "Admin", email: null, role: "admin" as const };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as "admin" | "readable";
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
