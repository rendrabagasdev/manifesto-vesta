"use server";

import { auth, signOut } from "@/auth";

export async function signOutAction() {
  const session = await auth();
  const role = session?.user?.role;
  const isStaff =
    role !== undefined && role !== "CONSUMER" && role !== "BUSINESS";

  await signOut({ redirectTo: isStaff ? "/login/admin" : "/login" });
}
