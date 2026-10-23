import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Leaf, LogOut } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";
import {
  BATCH_VIEW_ROLES,
  hasRole,
  ROLE_LABELS,
} from "@/src/lib/auth/roles";
import type { SessionUser } from "@/src/lib/auth/session";
import { initials } from "@/src/lib/batches/format";
import { DashboardNav } from "@/src/components/dashboard-nav";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const canViewBatches = hasRole(user.role, BATCH_VIEW_ROLES);
  const displayName = user.name ?? user.email ?? "Pengguna Vesta";

  return (
    <div className="min-h-dvh bg-surface-muted lg:p-2">
      <div className="mx-auto flex min-h-dvh max-w-[1560px] lg:min-h-[calc(100dvh-1rem)] lg:gap-2">
        <aside className="hidden w-56 shrink-0 flex-col px-2 py-3 lg:flex">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-lg px-2 py-1 font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
              <Leaf className="size-4" aria-hidden="true" />
            </span>
            <span>
              Vesta
              <span className="block text-[11px] font-medium text-ink-muted">
                Freshness cascade
              </span>
            </span>
          </Link>

          <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Operasional
          </p>
          <div className="mt-2">
            <DashboardNav
              role={user.role}
              canViewBatches={canViewBatches}
              variant="sidebar"
            />
          </div>

          <div className="mt-auto rounded-xl bg-surface/70 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                {initials(displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {displayName}
                </p>
                <p className="truncate text-xs text-ink-muted">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  aria-label="Keluar"
                  title="Keluar"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center justify-between gap-3 px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink lg:hidden"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
                  <Leaf className="size-3.5" aria-hidden="true" />
                </span>
                Vesta
              </Link>
              <span className="hidden items-center gap-1.5 text-xs text-ink-muted lg:flex">
                Ruang kerja
                <ChevronRight className="size-3" aria-hidden="true" />
                <span className="font-medium text-ink">Operasional</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="lg:hidden">
                <DashboardNav
                  role={user.role}
                  canViewBatches={canViewBatches}
                  variant="mobile"
                />
              </div>
              <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted sm:inline">
                Mode demo
              </span>
              <form action={signOutAction} className="lg:hidden">
                <button
                  type="submit"
                  aria-label="Keluar"
                  title="Keluar"
                  className="inline-flex size-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </header>

          <div className="flex-1 bg-surface lg:mb-2 lg:mr-2 lg:rounded-2xl lg:border lg:border-line">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
