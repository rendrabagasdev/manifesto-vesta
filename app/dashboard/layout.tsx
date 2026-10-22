import type { ReactNode } from "react";
import { AppShell } from "@/src/components/app-shell";
import { requireSession } from "@/src/lib/auth/session";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSession();
  return <AppShell user={user}>{children}</AppShell>;
}
