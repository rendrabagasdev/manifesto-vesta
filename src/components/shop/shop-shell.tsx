import type { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/dashboard/actions";
import {
  BUYER_ROLES,
  hasRole,
  ROLE_LABELS,
} from "@/src/lib/auth/roles";
import type { SessionUser } from "@/src/lib/auth/session";
import { initials } from "@/src/lib/batches/format";
import { CartBadge } from "./cart-badge";
import { BottomNav } from "./bottom-nav";
import { MarketplaceNav } from "@/src/components/marketplace/marketplace-nav";
import { VestaLogo } from "@/src/components/vesta-logo";

export function ShopShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const displayName = user.name ?? user.email ?? "Pengguna Vesta";
  const isBuyer = hasRole(user.role, BUYER_ROLES);

  return (
    <div
      className={`flex min-h-dvh flex-col bg-surface-muted${isBuyer ? " theme-buyer" : ""}`}
    >
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/marketplace"
            className="inline-flex shrink-0 items-center rounded-lg font-heading text-lg font-extrabold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="Vesta — beranda marketplace"
          >
            <VestaLogo className="size-9" />
          </Link>

          <div className="min-w-0">
            <MarketplaceNav variant="desktop" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <div className="hidden md:block">
              <CartBadge />
            </div>
            <Link
              href="/dashboard"
              className="hidden h-9 items-center rounded-md px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:inline-flex"
            >
              Dashboard
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                  {initials(displayName)}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="max-w-28 truncate text-xs font-semibold text-ink">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {ROLE_LABELS[user.role]}
                  </p>
                </div>
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>

      <footer className="border-t border-line bg-surface pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-heading text-sm font-bold tracking-tight text-ink">
            Vesta
          </p>
          <p>&copy; 2026 Vesta &middot; Mode demo</p>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg font-heading text-lg font-extrabold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Vesta — beranda"
        >
          <VestaLogo className="size-9" />
        </Link>
        <nav
          aria-label="Navigasi publik"
          className="flex items-center gap-1 text-sm"
        >
          <Link
            href="/impact"
            className="inline-flex h-8 items-center rounded-lg px-3 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Dampak
          </Link>
          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-lg bg-brand-strong px-3 font-semibold text-on-brand transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Masuk
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-semibold text-ink">
          Vesta &middot; Freshness Cascade Platform
        </p>
        <p>
          &copy; 2026 Vesta &middot; UNIC Web Development &middot; Mode demo
        </p>
      </div>
    </footer>
  );
}
