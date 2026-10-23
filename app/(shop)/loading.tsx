import { CardGridSkeleton, PageHeaderSkeleton } from "@/src/components/skeleton";

/** Loading state for the shop route group (marketplace, deals, feed, residu, cart, orders). */
export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      <PageHeaderSkeleton withAction />
      <CardGridSkeleton cards={6} />
    </div>
  );
}
