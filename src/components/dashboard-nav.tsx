"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardNavProps = {
  canViewBatches: boolean;
  variant: "sidebar" | "mobile";
};

export function DashboardNav({
  canViewBatches,
  variant,
}: DashboardNavProps) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    ...(canViewBatches
      ? [{ href: "/dashboard/batches", label: "Batch", icon: Package }]
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
                    ? "border-b-2 border-brand-strong text-ink"
                    : "border-b-2 border-transparent text-ink-muted hover:text-ink",
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
