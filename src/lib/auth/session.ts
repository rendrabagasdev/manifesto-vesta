import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@/src/lib/auth/roles";

export type SessionUser = NonNullable<Session["user"]>;

export async function requireSession(): Promise<SessionUser> {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(
  roles: readonly UserRole[],
): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
