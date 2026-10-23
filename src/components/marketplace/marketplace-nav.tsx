"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/rescue-deals", label: "Rescue Deal" },
  { href: "/feed", label: "Pakan" },
  { href: "/residue", label: "Residu" },
  { href: "/impact", label: "Dampak" },
] as const;

export function MarketplaceNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi marketplace"
      className={cn(
        variant === "desktop" ? "hidden md:flex items-center gap-1" : "flex",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/marketplace"
            ? pathname === "/marketplace" ||
              pathname.startsWith("/marketplace/")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              variant === "desktop"
                ? "h-9 px-3"
                : "h-10 px-3.5 border border-line bg-surface",
              active
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
