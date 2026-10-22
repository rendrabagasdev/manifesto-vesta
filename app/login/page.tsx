import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Leaf } from "lucide-react";
import { auth } from "@/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/src/lib/auth/demo-accounts";
import { ROLE_LABELS } from "@/src/lib/auth/roles";
import { LoginForm } from "./login-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Masuk — Vesta",
  description: "Masuk ke platform Freshness Cascade Vesta.",
};

const CASCADE_STAGES = [
  { name: "FRESH", threshold: "≥ 70", dot: "bg-stage-fresh" },
  { name: "RESCUE", threshold: "< 70", dot: "bg-stage-rescue" },
  { name: "FEED", threshold: "< 30", dot: "bg-stage-feed" },
  { name: "RESIDUE", threshold: "< 10", dot: "bg-stage-residue" },
  { name: "DISPOSED", threshold: "0", dot: "bg-stage-disposed" },
] as const;

export default async function LoginPage() {
  await connection();
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-dvh bg-surface text-ink lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-brand-strong px-10 py-12 text-on-brand lg:sticky lg:top-0 lg:flex lg:min-h-dvh lg:flex-col lg:justify-between xl:px-16 xl:py-16">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-on-brand">
              <Leaf className="size-5" aria-hidden="true" />
            </span>
            Vesta
          </Link>

          <p className="mt-16 max-w-lg text-balance font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-on-brand xl:text-4xl">
            Setiap bahan punya waktu.
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-on-brand/80">
            Satu platform yang menghubungkan produsen, gudang, dan pembeli
            untuk menyelamatkan bahan segar sebelum waktunya habis.
          </p>
        </div>

        <div className="mt-16">
          <p className="text-sm font-semibold text-brand-soft">Alur cascade</p>
          <ol className="mt-4 space-y-2">
            {CASCADE_STAGES.map((stage) => (
              <li
                key={stage.name}
                className="flex items-center justify-between gap-4 rounded-lg bg-on-brand/10 px-3.5 py-2.5"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`size-2 rounded-full ${stage.dot}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-on-brand">
                    {stage.name}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-on-brand/70">
                  {stage.threshold}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-on-brand/70">
            Freshness Score menentukan tahap berikutnya secara otomatis.
          </p>
        </div>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink lg:hidden"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
              <Leaf className="size-5" aria-hidden="true" />
            </span>
            Vesta
          </Link>

          <h1 className="text-balance font-heading text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Selamat datang kembali
          </h1>
          <p className="mt-2 text-base leading-relaxed text-ink-muted">
            Masuk untuk melanjutkan ke dashboard Vesta.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <details className="mt-8 rounded-lg bg-surface-muted p-4 text-ink-muted">
            <summary className="cursor-pointer text-sm font-semibold text-ink marker:text-brand">
              Akun demo untuk juri
            </summary>
            <p className="mt-2 text-sm leading-relaxed">
              Kata sandi semua akun:{" "}
              <code className="rounded bg-brand-soft font-sans px-1.5 py-0.5 text-[13px] text-ink">
                {DEMO_PASSWORD}
              </code>
            </p>
            <ul className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
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

          <p className="mt-10 text-sm text-ink-muted">
            &copy; 2026 Vesta &middot; UNIC Web Development
          </p>
        </div>
      </section>
    </main>
  );
}
