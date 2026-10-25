"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  House,
  ReceiptText,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-context";

const ITEMS = [
  { href: "/marketplace", label: "Beranda", icon: House },
  { href: "/rescue-deals", label: "Diskon", icon: Flame },
  { href: "/cart", label: "Keranjang", icon: ShoppingCart },
  { href: "/orders", label: "Pesanan", icon: ReceiptText },
  { href: "/dashboard/profile", label: "Profil", icon: UserRound },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { count, ready } = useCart();

  return (
    <nav
      aria-label="Navigasi belanja"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/marketplace"
              ? pathname === item.href ||
                pathname.startsWith(`${item.href}/`)
              : item.href === "/dashboard/profile"
                ? pathname === "/dashboard" ||
                  pathname.startsWith("/dashboard/")
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
          const showBadge = item.href === "/cart" && ready && count > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={
                  item.href === "/cart" && count > 0
                    ? `${item.label}, ${count} jenis barang`
                    : item.label
                }
                className="flex flex-col items-center gap-1 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                <span
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-brand-soft text-brand-ink"
                      : "text-ink-muted",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                  {showBadge ? (
                    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-brand-strong px-1 text-[10px] font-bold leading-4 text-on-brand">
                      {count}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none",
                    active ? "text-brand-ink" : "text-ink-muted",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
