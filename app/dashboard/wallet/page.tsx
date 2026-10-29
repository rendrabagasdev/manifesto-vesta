import type { Metadata } from "next";
import { ArrowDownCircle, ArrowUpCircle, Banknote } from "lucide-react";
import { requireRole } from "@/src/lib/auth/session";
import { formatDateTime, formatIdr, formatInteger } from "@/src/lib/batches/format";
import {
  getWalletForProducer,
  getWalletTransactions,
  getWalletWithdrawals,
  MIN_WITHDRAWAL_AMOUNT,
  withdrawalStatusLabel,
  type WalletTransactionView,
} from "@/src/lib/wallet/service";
import { EmptyState } from "@/src/components/shop/empty-state";
import { WithdrawalForm } from "@/src/components/wallet/withdrawal-form";

export const instant = false;

export const metadata: Metadata = {
  title: "Wallet produsen — Vesta",
  description: "Saldo, mutasi, dan penarikan hasil penjualan harga dasar produk.",
};

const STATUS_TONES: Record<string, string> = {
  PENDING: "border-line bg-surface-muted text-ink-muted",
  APPROVED: "border-brand/25 bg-brand-soft text-brand-strong",
  REJECTED: "border-danger/25 bg-danger-soft text-danger",
};

export default async function WalletPage() {
  const user = await requireRole(["PRODUCER"]);

  const { wallet } = await getWalletForProducer(Number(user.id));
  if (!wallet) {
    return (
      <div>
        <header className="max-w-xl">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Wallet
          </h1>
        </header>
        <div className="mt-6 max-w-xl">
          <EmptyState
            title="Profil produsen belum dibuat"
            description="Hubungi admin untuk mengaitkan akun Anda dengan profil kebun terlebih dahulu."
          />
        </div>
      </div>
    );
  }

  const [transactions, withdrawals] = await Promise.all([
    getWalletTransactions(wallet.id),
    getWalletWithdrawals(wallet.id),
  ]);

  return (
    <div>
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
          Wallet
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {wallet.farmName} · saldo dari harga dasar produk Anda
        </p>
      </header>

      <section
        aria-label="Ringkasan wallet"
        className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3"
      >
        <div className="bg-surface p-5">
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Banknote className="size-3.5" aria-hidden="true" />
            Saldo tersedia
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatIdr(wallet.balance)}
          </p>
        </div>
        <div className="bg-surface p-5">
          <p className="text-xs text-ink-muted">Total ditarik</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatIdr(wallet.withdrawnTotal)}
          </p>
        </div>
        <div className="bg-surface p-5">
          <p className="text-xs text-ink-muted">Mutasi tercatat</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {formatInteger(transactions.length)}
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="withdrawal-heading"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h2 id="withdrawal-heading" className="text-sm font-semibold text-ink">
            Ajukan penarikan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Minimal {formatIdr(MIN_WITHDRAWAL_AMOUNT)}. Saldo tidak terpotong
            saat pengajuan — baru didebit setelah admin menyetujui.
          </p>
          <div className="mt-4">
            <WithdrawalForm balance={wallet.balance} />
          </div>
        </section>

        <div className="grid gap-4">
          <section
            aria-labelledby="history-heading"
            className="rounded-xl border border-line bg-surface"
          >
            <h2
              id="history-heading"
              className="border-b border-line px-4 py-3 text-sm font-semibold text-ink"
            >
              Riwayat penarikan
            </h2>
            {withdrawals.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">
                Belum ada permintaan penarikan.
              </p>
            ) : (
              <ul>
                {withdrawals.slice(0, 5).map((withdrawal) => (
                  <li
                    key={withdrawal.id}
                    className="border-b border-line px-4 py-3 last:border-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">
                        #{withdrawal.id} · {formatIdr(withdrawal.amount)}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_TONES[withdrawal.status] ?? STATUS_TONES.PENDING
                        }`}
                      >
                        {withdrawalStatusLabel(withdrawal.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {withdrawal.bankName} · {withdrawal.bankAccountNumber} ·{" "}
                      {withdrawal.reviewedAt
                        ? `Ditinjau ${formatDateTime(withdrawal.reviewedAt)}`
                        : `Diajukan ${formatDateTime(withdrawal.createdAt)}`}
                    </p>
                    {withdrawal.decisionNote ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        Catatan: {withdrawal.decisionNote}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section
        aria-labelledby="ledger-heading"
        className="mt-4 rounded-xl border border-line bg-surface"
      >
        <h2
          id="ledger-heading"
          className="border-b border-line px-4 py-3 text-sm font-semibold text-ink"
        >
          Mutasi saldo
        </h2>
        {transactions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">
            Belum ada mutasi — saldo masuk otomatis saat pesanan produk Anda
            terbayar.
          </p>
        ) : (
          <ul>
            {transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: WalletTransactionView }) {
  const positive = transaction.type === "CREDIT";

  return (
    <li className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
          positive ? "bg-brand-soft text-brand-strong" : "bg-danger-soft text-danger"
        }`}
      >
        {positive ? (
          <ArrowUpCircle className="size-4" aria-hidden="true" />
        ) : (
          <ArrowDownCircle className="size-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          {transaction.description ?? transaction.reference ?? "Mutasi wallet"}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {formatDateTime(transaction.createdAt)} · saldo {formatIdr(transaction.balanceAfter)}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          positive ? "text-brand-strong" : "text-danger"
        }`}
      >
        {positive ? "+" : "−"}
        {formatIdr(Math.abs(transaction.amount))}
      </p>
    </li>
  );
}
