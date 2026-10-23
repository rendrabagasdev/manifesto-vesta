import type { ReactNode } from "react";
import { CartProvider } from "@/src/components/shop/cart-context";
import { ShopShell } from "@/src/components/shop/shop-shell";
import { requireSession } from "@/src/lib/auth/session";

export const instant = false;

export default async function ShopLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSession();

  return (
    <CartProvider>
      <ShopShell user={user}>{children}</ShopShell>
    </CartProvider>
  );
}
