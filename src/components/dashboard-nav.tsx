"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  HandCoins,
  IdCard,
  LayoutDashboard,
  Package,
  Settings2,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  UserRound,
  Wallet,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/src/lib/auth/roles";
import { BUYER_ROLES } from "@/src/lib/auth/roles";

type DashboardNavItem = {
  href: string;
  label: string;
  icon: typeof Package;
};

const ROLE_MODULE: Record<
  UserRole,
  { href: string; label: string; icon: typeof Package } | null
> = {
  ADMIN: { href: "/dashboard/admin", label: "Modul admin", icon: ShieldCheck },
  PRODUCER: { href: "/dashboard/producer", label: "Modul produsen", icon: Sprout },
  WAREHOUSE: { href: "/dashboard/warehouse", label: "Modul gudang", icon: Warehouse },
  CONSUMER: { href: "/dashboard/consumer", label: "Akun saya", icon: UserRound },
  BUSINESS: { href: "/dashboard/business", label: "Modul bisnis", icon: Briefcase },
};

/**
 * The destinations a role sees, in the order every dashboard surface renders
 * them: the sidebar on desktop and the mobile hamburger sheet.
 */
export function getDashboardNavItems(
  role: UserRole,
  canViewBatches: boolean,
): DashboardNavItem[] {
  const roleModule = ROLE_MODULE[role];

  return [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    ...(canViewBatches
      ? [{ href: "/dashboard/batches", label: "Batch", icon: Package }]
      : []),
    ...(role === "ADMIN" || role === "PRODUCER"
      ? [{ href: "/dashboard/products", label: "Produk", icon: Sprout }]
      : []),
    ...(role === "ADMIN" || role === "WAREHOUSE"
      ? [
          {
            href: "/dashboard/orders",
            label: "Pesanan",
            icon: ClipboardList,
          },
        ]
      : []),
    ...(role === "ADMIN"
      ? [
          {
            href: "/dashboard/admin/warehouses",
            label: "Kelola gudang",
            icon: Warehouse,
          },
          {
            href: "/dashboard/admin/payouts",
            label: "Payout",
            icon: HandCoins,
          },
          {
            href: "/dashboard/admin/config",
            label: "Konfigurasi",
            icon: Settings2,
          },
        ]
      : []),
    ...(role === "PRODUCER"
      ? [{ href: "/dashboard/wallet", label: "Wallet", icon: Wallet }]
      : []),
    ...(roleModule ? [roleModule] : []),
    { href: "/dashboard/profile", label: "Profil", icon: IdCard },
    ...(BUYER_ROLES.includes(role)
      ? [{ href: "/marketplace", label: "Belanja", icon: ShoppingBasket }]
      : []),
  ];
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ role, canViewBatches }: {
  role: UserRole;
  canViewBatches: boolean;
}) {
  const pathname = usePathname();
  const items = getDashboardNavItems(role, canViewBatches);
  const activeHref = items
    .map((item) => item.href)
    .filter((href) => isItemActive(pathname, href))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      aria-label="Navigasi ruang kerja"
      className="min-w-0 space-y-1"
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-surface text-ink"
                : "text-ink-muted hover:bg-surface/70 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
