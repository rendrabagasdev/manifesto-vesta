import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, Leaf } from "lucide-react";
import { auth } from "@/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/src/lib/auth/demo-accounts";
import { ROLE_LABELS } from "@/src/lib/auth/roles";
import { AdminLoginForm } from "./login-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Masuk Admin — Vesta",
  description: "Masuk ke dashboard operasional Vesta.",
};

const staffDemoAccounts = DEMO_ACCOUNTS.filter(
  (account) => account.role !== "CONSUMER" && account.role !== "BUSINESS",
);

export default async function AdminLoginPage() {
  await connection();
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-dvh bg-surface text-ink lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden overflow-hidden rounded-r-4xl bg-brand-strong text-on-brand lg:sticky lg:top-0 lg:flex lg:min-h-dvh lg:flex-col lg:justify-between xl:py-0">
        <video
          src="/assets/login.mp4"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          className="block h-full w-full flex-1 object-cover"
        />
      </section>
      <section className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/login/admin"
            className="mb-10 inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink lg:hidden"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
              <Leaf className="size-5" aria-hidden="true" />
            </span>
            Vesta
          </Link>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-strong">
            Akses admin
          </p>
          <h1 className="text-balance font-heading text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Selamat datang kembali
          </h1>
          <p className="mt-2 text-base leading-relaxed text-ink-muted">
            Masuk untuk melanjutkan ke dashboard Vesta.
          </p>

          <div className="mt-8">
            <AdminLoginForm />
          </div>

          <details className="mt-8 rounded-lg bg-surface-muted p-4 text-ink-muted">
            <summary className="cursor-pointer text-sm font-semibold text-ink marker:text-brand">
              Akun demo operasional
            </summary>
            <p className="mt-2 text-sm leading-relaxed">
              Kata sandi semua akun:{" "}
              <code className="rounded bg-brand-soft px-1.5 py-0.5 font-sans text-[13px] text-ink">
                {DEMO_PASSWORD}
              </code>
            </p>
            <ul className="mt-3 space-y-2">
              {staffDemoAccounts.map((account) => (
                <li
                  key={account.email}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                >
                  <span className="text-sm font-medium text-ink">
                    {ROLE_LABELS[account.role]}
                  </span>
                  <code className="break-all font-sans text-[13px] text-ink-muted">
                    {account.email}
                  </code>
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-8 border-t border-line pt-5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong transition-colors hover:text-brand"
            >
              Masuk sebagai pembeli
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <p className="mt-5 text-sm text-ink-muted">
              &copy; 2026 Vesta &middot; UNIC Web Development
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
