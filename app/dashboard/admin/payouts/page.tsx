import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HandCoins } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import { formatDateTime, formatIdr } from "@/src/lib/batches/format";
import {
  listWithdrawalsForAdmin,
  withdrawalStatusLabel,
} from "@/src/lib/wallet/service";
import { PayoutReviewForm } from "@/src/components/wallet/payout-review-form";
import { EmptyState } from "@/src/components/shop/empty-state";

export const instant = false;

export const metadata: Metadata = {
  title: "Payout produsen — Vesta",
  description: "Review permintaan penarikan saldo produsen.",
};

const STATUS_TONES: Record<string, string> = {
  PENDING: "border-line bg-surface-muted text-ink-muted",
  APPROVED: "border-brand/25 bg-brand-soft text-brand-strong",
  REJECTED: "border-danger/25 bg-danger-soft text-danger",
};

export default async function PayoutsPage() {
  const user = await requireRole(["ADMIN"]);

  const [pending, settled] = await Promise.all([
    listWithdrawalsForAdmin("PENDING"),
    listWithdrawalsForAdmin("APPROVED"),
  ]);

  // Admin who reaches this URL from other sections is allowed; other roles
  // already get redirected by requireRole.
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Payout produsen
        </h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Setujui atau tolak permintaan penarikan. Saldo hanya didebit saat
          Anda menyetujui, dan pencatatan berjalan di ledger wallet.
        </p>
      </header>

      <section
        aria-labelledby="pending-payout-heading"
        className="mt-6 rounded-xl border border-line bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2
            id="pending-payout-heading"
            className="flex items-center gap-2 text-sm font-semibold text-ink"
          >
            <HandCoins className="size-4" aria-hidden="true" />
            Menunggu review
          </h2>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              title="Tidak ada permintaan"
              description="Semua permintaan penarikan sudah ditinjau."
            />
          </div>
        ) : (
          <ul>
            {pending.map((payout) => (
              <li key={payout.id} className="border-b border-line px-4 py-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    #{payout.id} · {payout.farmName}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-ink">
                    {formatIdr(payout.amount)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {payout.requestedByName ?? "Produsen"} · {payout.bankName} ·{" "}
                  {payout.bankAccountNumber} ({payout.bankAccountName}) · diajukan{" "}
                  {formatDateTime(payout.createdAt)}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Saldo wallet saat ini {formatIdr(payout.walletBalance)}
                  {payout.note ? ` · Catatan: ${payout.note}` : ""}
                </p>
                <div className="mt-3 max-w-md">
                  <PayoutReviewForm withdrawalId={payout.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="approved-payout-heading"
        className="mt-4 rounded-xl border border-line bg-surface"
      >
        <h2
          id="approved-payout-heading"
          className="border-b border-line px-4 py-3 text-sm font-semibold text-ink"
        >
          Terakhir disetujui
        </h2>
        {settled.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">
            Belum ada penarikan yang disetujui.
          </p>
        ) : (
          <ul>
            {settled.slice(0, 8).map((payout) => (
              <li key={payout.id} className="border-b border-line px-4 py-3 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    #{payout.id} · {payout.farmName}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatIdr(payout.amount)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        STATUS_TONES[payout.status] ?? STATUS_TONES.PENDING
                      }`}
                    >
                      {withdrawalStatusLabel(payout.status)}
                    </span>
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Ditinjau{" "}
                  {payout.reviewedByName
                    ? `oleh ${payout.reviewedByName} · `
                    : ""}
                  {payout.reviewedAt ? formatDateTime(payout.reviewedAt) : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
