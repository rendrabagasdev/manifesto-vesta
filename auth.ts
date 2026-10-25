import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/src/prisma/db";
import { loginSchema } from "@/src/lib/auth/validation";
import type { UserRole } from "@/src/lib/auth/roles";

export interface CredentialInput {
  email?: unknown;
  password?: unknown;
}

/**
 * Credential check shared by NextAuth and the integration tests. Keeping it
 * separate from `NextAuth(...)` lets tests exercise the real validation,
 * lookup and bcrypt comparison without booting an HTTP server.
 */
export async function authenticateCredentials(
  credentials: CredentialInput | undefined,
) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await db.orm.public.User.where({
    email: parsed.data.email,
  }).first();
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user.passwordHash,
  );
  if (!passwordMatches) return null;

  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      authorize: authenticateCredentials,
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      if (trigger === "update") {
        const name = (session as { user?: { name?: unknown } } | null)?.user
          ?.name;
        if (typeof name === "string" && name.trim()) {
          token.name = name;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "CONSUMER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut, unstable_update } =
  NextAuth(authConfig);
