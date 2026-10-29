import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { ROLE_LABELS } from "@/src/lib/auth/roles";
import { db } from "@/src/prisma/db";
import { formatDate, initials } from "@/src/lib/batches/format";
import { ProfileForm } from "@/src/components/profile/profile-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Profil · Vesta",
  description: "Kelola informasi pribadi dan alamat pengiriman Anda.",
};

export default async function ProfilePage() {
  await connection();
  const sessionUser = await requireSession();

  const user = await db.orm.public.User.where({
    id: Number(sessionUser.id),
  })
    .select(
      "id",
      "email",
      "username",
      "name",
      "phone",
      "city",
      "address",
      "role",
      "createdAt",
    )
    .first();

  if (!user) redirect("/login");

  const displayName = user.name ?? user.email;

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Profil
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Kelola informasi pribadi dan alamat pengiriman Anda.
        </p>
      </header>

      <div className="mt-6 grid max-w-5xl gap-4 lg:grid-cols-[1fr_320px]">
        <ProfileForm
          user={{
            email: user.email,
            name: user.name,
            username: user.username,
            phone: user.phone,
            city: user.city,
            address: user.address,
          }}
        />

        <aside className="h-fit rounded-xl border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Ringkasan akun</h2>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {displayName}
              </p>
              <p className="mt-0.5 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                {ROLE_LABELS[sessionUser.role]}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-ink-muted">Email</dt>
              <dd className="min-w-0 break-all text-right text-ink">
                {user.email}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-ink-muted">Kota</dt>
              <dd className="min-w-0 text-right text-ink">
                {user.city ?? "Belum diisi"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-ink-muted">Bergabung</dt>
              <dd className="text-right tabular-nums text-ink">
                {formatDate(user.createdAt.slice(0, 10))}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
