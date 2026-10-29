"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/dashboard/actions";
import { getDashboardNavItems } from "@/src/components/dashboard-nav";
import { ROLE_LABELS, type UserRole } from "@/src/lib/auth/roles";
import { initials } from "@/src/lib/batches/format";
import { VestaLogo } from "@/src/components/vesta-logo";

type MobileMenuProps = {
  role: UserRole;
  canViewBatches: boolean;
  displayName: string;
};

/**
 * Phone navigation for the dashboard shell: one 44px hamburger in the top bar
 * that opens a plain full-screen sheet with the destinations, the account row
 * and sign out. No inline scrolling nav, no floating controls.
 */
export function MobileMenu({
  role,
  canViewBatches,
  displayName,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = getDashboardNavItems(role, canViewBatches);
  const activeHref = items
    .map((item) => item.href)
    .filter((href) =>
      href === "/dashboard"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];

  useEffect(() => {
    // Sheet harus menutup sendiri saat rute berubah setelah link diketuk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu-sheet"
        aria-label="Buka menu navigasi"
        className="inline-flex size-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          id="mobile-menu-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className="fixed inset-0 z-50 overflow-y-auto bg-surface-muted"
        >
          <div className="min-h-dvh px-4 py-3">
            <header className="flex h-11 items-center justify-between">
              <span className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink">
                <VestaLogo className="size-9" />
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                autoFocus
                className="inline-flex size-11 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <p className="px-3 pb-2 pt-6 text-xs font-medium text-ink-muted">
              Navigasi
            </p>
            <nav aria-label="Menu utama">
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = item.href === activeHref;
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                          active
                            ? "bg-surface text-ink"
                            : "text-ink-muted hover:bg-surface hover:text-ink",
                        )}
                      >
                        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-6 rounded-xl bg-surface p-3">
              <div className="flex items-center gap-1">
                <Link
                  href="/dashboard/profile"
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                    {initials(displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {ROLE_LABELS[role]}
                    </p>
                  </div>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    aria-label="Keluar"
                    title="Keluar"
                    className="inline-flex size-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
