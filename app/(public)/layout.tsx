import type { ReactNode } from "react";
import { PublicFooter, PublicHeader } from "@/src/components/shop/shop-shell";

export const instant = false;

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
