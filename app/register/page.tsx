import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Leaf } from "lucide-react";
import { auth } from "@/auth";
import { RegisterForm } from "./register-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Daftar — Vesta",
  description: "Buat akun Vesta untuk belanja bahan segar langsung dari produsen.",
};

export default async function RegisterPage() {
  await connection();
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col background-orange text-ink lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex flex-1 flex-col overflow-hidden background-orange text-on-brand lg:min-h-dvh">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 size-64 rounded-full bg-on-brand/10 sm:size-72" />
          <div className="absolute right-5 top-28 size-24 rounded-full bg-on-brand/10 sm:right-12 sm:size-28" />
          <div className="absolute bottom-[-26%] left-1/2 size-[340px] -translate-x-1/2 rounded-full bg-stage-rescue sm:size-[400px] lg:bottom-[-16%] lg:left-auto lg:right-[-6%] lg:size-[540px] lg:translate-x-0" />
        </div>

        <div className="relative z-10 px-6 pt-8 sm:px-10 lg:px-12 lg:pt-12 xl:px-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-on-brand"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-on-brand/15">
              <Leaf className="size-5" aria-hidden="true" />
            </span>
            Vesta
          </Link>

          <div className="mt-7 max-w-md lg:mt-14">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-on-brand/70 lg:block">
              Untuk rumah tangga &amp; usaha
            </p>
            <h1 className="mt-0 text-balance font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:mt-3 xl:text-6xl">
              <span className="lg:hidden">Daftar</span>
              <span className="hidden lg:inline">Mulai belanja lebih adil.</span>
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-on-brand/80 sm:text-base lg:mt-5">
              <span className="lg:hidden">
                Buat akun untuk belanja bahan segar.
              </span>
              <span className="hidden lg:inline">
                Bergabung untuk menikmati bahan segar langsung dari produsen.
              </span>
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-3 flex flex-1 items-end justify-center px-4 lg:mt-0 lg:justify-end lg:px-10 xl:px-16">
          <Image
            src="/assets/maskot_register.svg"
            alt="Ilustrasi petani membawa keranjang sayur"
            width={560}
            height={1004}
            preload
            className="h-[260px] w-auto drop-shadow-xl sm:h-[300px] lg:h-[420px] xl:h-[500px]"
          />
        </div>
      </section>

      <section className="relative z-10 -mt-6 rounded-t-[28px] bg-surface px-6 pb-10 pt-4 shadow-xl sm:px-10 lg:mt-0 lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:rounded-none lg:px-14 lg:py-12 lg:shadow-none xl:px-20">
        <div className="mx-auto w-full max-w-md lg:max-w-sm">
          <div
            aria-hidden="true"
            className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-line lg:hidden"
          />

          <h2 className="hidden font-heading text-3xl font-extrabold tracking-tight text-ink lg:block">
            Buat akun Vesta
          </h2>
          <p className="hidden text-base leading-relaxed text-ink-muted lg:mt-2 lg:block">
            Daftar untuk mulai belanja bahan segar.
          </p>

          <div className="lg:mt-8">
            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Masuk
            </Link>
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <p className="text-xs text-ink-muted">
              &copy; 2026 Vesta &middot; UNIC Web Development
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
