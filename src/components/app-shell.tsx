import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";
import {
  BATCH_VIEW_ROLES,
  BUYER_ROLES,
  hasRole,
  ROLE_LABELS,
} from "@/src/lib/auth/roles";
import type { SessionUser } from "@/src/lib/auth/session";
import { initials } from "@/src/lib/batches/format";
import { DashboardNav } from "@/src/components/dashboard-nav";
import { MobileMenu } from "@/src/components/dashboard/mobile-menu";
import { BottomNav } from "@/src/components/shop/bottom-nav";
import { VestaLogo } from "@/src/components/vesta-logo";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const canViewBatches = hasRole(user.role, BATCH_VIEW_ROLES);
  const isBuyer = hasRole(user.role, BUYER_ROLES);
  const displayName = user.name ?? user.email ?? "Pengguna Vesta";

  return (
    <div
      className={`min-h-dvh bg-surface-muted lg:h-dvh lg:overflow-hidden lg:p-2${isBuyer ? " theme-buyer" : ""}`}
    >
      <div className="mx-auto flex min-h-dvh max-w-[1560px] lg:h-full lg:min-h-0 lg:gap-2">
        <aside className="hidden w-56 shrink-0 flex-col px-2 py-3 lg:flex lg:h-full lg:min-h-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg px-2 py-1 font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="Vesta — beranda dashboard"
          >
            <VestaLogo className="size-9" />
          </Link>

          <p className="mt-8 px-3 text-xs font-medium text-ink-muted">
            Operasional
          </p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <DashboardNav
              role={user.role}
              canViewBatches={canViewBatches}
            />
          </div>

          <div className="mt-auto shrink-0 rounded-xl bg-surface/70 p-3">
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/profile"
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition-colors hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
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
              </Link>
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

        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
          <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4 lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Beranda dashboard"
                className="inline-flex items-center rounded-lg font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:px-2 lg:py-1"
              >
                <VestaLogo className="size-9" />
              </Link>
              <span className="hidden items-center gap-1.5 text-xs text-ink-muted lg:flex">
                Ruang kerja
                <ChevronRight className="size-3" aria-hidden="true" />
                <span className="font-medium text-ink">Operasional</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted md:inline">
                Mode demo
              </span>
              <MobileMenu
                role={user.role}
                canViewBatches={canViewBatches}
                displayName={displayName}
              />
            </div>
          </header>

          <main className="flex-1 bg-surface lg:mb-2 lg:mr-2 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-line">
            <div
              className={`mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8 ${
                isBuyer ? "pb-24 md:pb-6 lg:pb-8" : "pb-6 lg:pb-8"
              }`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      {isBuyer ? <BottomNav /> : null}
    </div>
  );
}
