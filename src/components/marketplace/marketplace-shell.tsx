import type { ReactNode } from "react";
import Link from "next/link";
import { Leaf, LayoutDashboard } from "lucide-react";
import { ROLE_LABELS } from "@/src/lib/auth/roles";
import type { SessionUser } from "@/src/lib/auth/session";
import { initials } from "@/src/lib/batches/format";
import { MarketplaceNav } from "@/src/components/marketplace/marketplace-nav";
import { CartIndicator } from "@/src/components/marketplace/cart-indicator";

/**
 * Shell for signed-in marketplace pages (route group `(shop)`).
 * Plain top bar: wordmark, links, cart, account.
 */
export function MarketplaceShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const displayName = user.name ?? user.email ?? "Pengguna Vesta";

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/marketplace"
            className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
              <Leaf className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">Vesta</span>
          </Link>

          <div className="min-w-0 flex-1">
            <MarketplaceNav variant="desktop" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <CartIndicator />
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              title="Ke dashboard"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-strong">
                {initials(displayName)}
              </span>
              <span className="hidden max-w-28 truncate lg:inline">
                {ROLE_LABELS[user.role]}
              </span>
              <LayoutDashboard
                className="hidden size-4 lg:inline"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
        <div className="border-t border-line md:hidden">
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 py-2 sm:px-6">
            <MarketplaceNav variant="mobile" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-semibold text-ink">
            Vesta &middot; Freshness Cascade Platform
          </p>
          <p>
            Tanpa tengkulak &middot; setiap tahap punya pembeli &middot;{" "}
            <Link
              href="/impact"
              className="font-medium text-brand-strong hover:underline"
            >
              Laporan dampak publik
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
