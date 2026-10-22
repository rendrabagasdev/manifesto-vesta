import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Leaf, LogOut } from "lucide-react";
import { auth } from "@/auth";
import {
  ROLE_LABELS,
  ROLE_MODULES,
  ROLE_SUMMARIES,
} from "@/src/lib/auth/roles";
import { signOutAction } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard — Vesta",
  description: "Dashboard Vesta sesuai peran pengguna.",
};

export default async function DashboardPage() {
  await connection();
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { email, name, role } = session.user;
  const modules = ROLE_MODULES[role];

  return (
    <main className="min-h-dvh bg-canvas text-ink">
      <header className="bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
              <Leaf className="size-4" aria-hidden="true" />
            </span>
            Vesta
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-balance font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Halo, {name ?? "Pengguna Vesta"}
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-muted">
          {ROLE_LABELS[role]} &middot; {email}
        </p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
          {ROLE_SUMMARIES[role]}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module} className="rounded-xl bg-surface p-5">
              <h2 className="font-heading text-lg font-bold tracking-tight text-ink">
                {module}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Modul ini sedang disiapkan pada tahap berikutnya.
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-xl bg-brand-strong p-6 text-on-brand">
          <p className="font-heading text-lg font-bold tracking-tight">
            Fondasi akun aktif
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-brand/80">
            Login, sesi JWT, dan pemetaan lima peran sudah berjalan. Berikutnya kita
            membangun batch, Freshness Score, dan cascade engine.
          </p>
        </div>
      </section>
    </main>
  );
}
