"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  UserRound,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/src/lib/auth/roles";

type DashboardNavProps = {
  role: UserRole;
  canViewBatches: boolean;
  variant: "sidebar" | "mobile";
};

const ROLE_MODULE: Record<UserRole, { href: string; label: string; icon: typeof Package } | null> = {
  ADMIN: { href: "/dashboard/admin", label: "Modul admin", icon: ShieldCheck },
  PRODUCER: { href: "/dashboard/producer", label: "Modul produsen", icon: Sprout },
  WAREHOUSE: { href: "/dashboard/warehouse", label: "Modul gudang", icon: Warehouse },
  CONSUMER: { href: "/dashboard/consumer", label: "Akun saya", icon: UserRound },
  BUSINESS: { href: "/dashboard/consumer", label: "Akun saya", icon: UserRound },
};

const BUYER_ROLES: UserRole[] = ["CONSUMER", "BUSINESS"];

export function DashboardNav({ role, canViewBatches, variant }: DashboardNavProps) {
  const pathname = usePathname();
  const roleModule = ROLE_MODULE[role];

  const items = [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    ...(canViewBatches
      ? [{ href: "/dashboard/batches", label: "Batch", icon: Package }]
      : []),
    ...(roleModule ? [{ ...roleModule }] : []),
    ...(BUYER_ROLES.includes(role)
      ? [{ href: "/marketplace", label: "Belanja", icon: ShoppingBasket }]
      : []),
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        variant === "sidebar" ? "space-y-1" : "flex items-center gap-1",
      )}
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              variant === "sidebar"
                ? "h-9 w-full rounded-lg px-3 font-medium"
                : "h-11 rounded-lg px-2.5 font-semibold",
              variant === "sidebar" && active
                ? "bg-surface text-ink"
                : variant === "sidebar"
                  ? "text-ink-muted hover:bg-surface/70 hover:text-ink"
                  : active
                    ? "bg-surface text-ink"
                    : "text-ink-muted hover:bg-surface/70 hover:text-ink",
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                variant === "sidebar" ? "size-4" : "size-[18px]",
              )}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
