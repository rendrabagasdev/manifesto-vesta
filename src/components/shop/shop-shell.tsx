import type { ReactNode } from "react";
import Link from "next/link";
import { Leaf, LogOut, Store } from "lucide-react";
import { signOutAction } from "@/app/dashboard/actions";
import { ROLE_LABELS } from "@/src/lib/auth/roles";
import type { SessionUser } from "@/src/lib/auth/session";
import { initials } from "@/src/lib/batches/format";
import { CartBadge } from "./cart-badge";

const SHOP_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/rescue-deals", label: "Penawaran Layu" },
  { href: "/feed", label: "Pakan" },
  { href: "/residue", label: "Residu" },
  { href: "/impact", label: "Dampak" },
] as const;

export function ShopShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const displayName = user.name ?? user.email ?? "Pengguna Vesta";

  return (
    <div className="min-h-dvh bg-surface-muted">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/marketplace"
            className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
              <Leaf className="size-4" aria-hidden="true" />
            </span>
            Vesta
          </Link>

          <nav
            aria-label="Navigasi marketplace"
            className="ml-4 hidden min-w-0 items-center gap-1 md:flex"
          >
            {SHOP_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <CartBadge />
            <Link
              href="/dashboard"
              className="inline-flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label="Ke dashboard"
              title="Dashboard"
            >
              <Store className="size-[18px]" aria-hidden="true" />
            </Link>
            <div className="hidden items-center gap-2.5 rounded-lg py-1 pl-2 pr-1 sm:flex">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
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
        </div>

        <nav
          aria-label="Navigasi marketplace seluler"
          className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 md:hidden"
        >
          {SHOP_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-semibold text-ink">
            Vesta &middot; Platform Kaskade Kesegaran
          </p>
          <p>
            &copy; 2026 Vesta &middot; UNIC Web Development &middot; Mode demo
          </p>
        </div>
      </footer>
    </div>
  );
}

export function PublicHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-strong text-on-brand">
            <Leaf className="size-4" aria-hidden="true" />
          </span>
          Vesta
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
