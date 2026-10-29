import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import type { UserRole } from "@/src/lib/auth/roles";
import {
  calculateProducerShareForItem,
  orderPaymentReference,
  orderRevokeReference,
  withdrawalReference,
} from "@/src/lib/wallet/share";

type QueryClient = Pick<typeof db, "orm">;
type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const WITHDRAWAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type WithdrawalStatusValue = (typeof WITHDRAWAL_STATUSES)[number];

export const MIN_WITHDRAWAL_AMOUNT = 10_000;

export interface ProducerWalletView {
  id: number;
  producerId: number;
  farmName: string;
  balance: number;
  withdrawnTotal: number;
  createdAt: string;
}

export interface WalletTransactionView {
  id: number;
  type: "CREDIT" | "DEBIT";
  source: "ORDER" | "WITHDRAWAL" | "ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

export interface WithdrawalRequestView {
  id: number;
  walletId: number;
  amount: number;
  status: WithdrawalStatusValue;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  note: string | null;
  decisionNote: string | null;
  requestedByName: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface WalletPaymentEntry {
  walletId: number;
  producerId: number;
  /** Positive rupiah credited to this wallet for the order. */
  credited: number;
}

export interface OrderPaymentCreditResult {
  entries: WalletPaymentEntry[];
  orderCode: string;
}

export interface WalletRevokeEntry {
  walletId: number;
  /** Positive rupiah that was removed from this wallet. */
  revoked: number;
}

export interface OrderPaymentRevokeResult {
  entries: WalletRevokeEntry[];
  orderCode: string;
}

export function withdrawalStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Menunggu review";
    case "APPROVED":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */
/* Wallet plumbing                                                     */
/* ------------------------------------------------------------------ */

/** Wallet lookup with on-demand creation. Wallet rows are only ever minted
 *  here — inside a transaction — so no caller can create balances directly. */
async function ensureWallet(
  client: QueryClient | TxClient,
  producerId: number,
) {
  const existing = await client.orm.public.ProducerWallet
    .where({ producerId })
    .first();

  if (existing) return existing;
  return client.orm.public.ProducerWallet.create({
    producerId,
    balance: 0,
    withdrawnTotal: 0,
  });
}

/** Row lock serialises every wallet mutation; balance math happens after. */
async function lockWallet(tx: TxClient, walletId: number) {
  const locked = await tx.orm.public.ProducerWallet
    .where({ id: walletId })
    .forUpdate()
    .first();
  if (!locked) {
    throw new ApiError(
      "Wallet produsen tidak ditemukan.",
      404,
      "WALLET_NOT_FOUND",
    );
  }
  return locked;
}

async function findWalletTransaction(
  tx: TxClient,
  filter: {
    walletId: number;
    source: "ORDER" | "WITHDRAWAL" | "ADJUSTMENT";
    reference: string | null;
  },
) {
  const rows = await tx.orm.public.WalletTransaction
    .where(filter)
    .all();
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Order payment credits                                               */
/* ------------------------------------------------------------------ */

/**
 * Credit every producer wallet that owns batches in this order.
 *
 * Amounts are always derived from server-side records
 * (`product.basePricePerKg` + `priceBreakdown.rescueDiscountPct`) so neither a
 * forged request nor a tampered webhook payload can inflate a payout.
 *
 * Idempotent: the [walletId, source, reference] unique constraint on the
 * ledger plus the locked re-read make replayed webhooks a no-op. Safe to call
 * from both the demo settle path and the Midtrans webhook.
 */
export async function creditOrderPayment(
  tx: TxClient,
  options: { orderId: number; orderCode: string },
): Promise<OrderPaymentCreditResult | null> {
  const reference = orderPaymentReference(options.orderCode);

  const items = await tx.orm.public.OrderItem
    .where({ orderId: options.orderId })
    .include("batch", (batch) =>
      batch
        .include("product", (product) =>
          product.select("id", "name", "producerId", "basePricePerKg"),
        )
        .include("priceBreakdown"),
    )
    .all();

  const creditsByProducer = new Map<number, number>();

  for (const item of items) {
    const product = item.batch?.product;
    const priceBreakdown = item.batch?.priceBreakdown;
    if (!product) continue;

    const credited = calculateProducerShareForItem({
      basePricePerKg: product.basePricePerKg,
      rescueDiscountPct: priceBreakdown?.rescueDiscountPct ?? 0,
      quantityKg: item.quantityKg,
    });
    if (credited <= 0) continue;

    creditsByProducer.set(
      product.producerId,
      (creditsByProducer.get(product.producerId) ?? 0) + credited,
    );
  }

  if (creditsByProducer.size === 0) return null;

  const entries: WalletPaymentEntry[] = [];

  for (const producerId of [...creditsByProducer.keys()].sort((a, b) => a - b)) {
    const amount = creditsByProducer.get(producerId) ?? 0;

    const base = await ensureWallet(tx, producerId);
    const locked = await lockWallet(tx, base.id);

    // After the lock, re-check the ledger: a replayed webhook that already
    // credited this order turns this call into a no-op.
    const existing = await findWalletTransaction(tx, {
      walletId: locked.id,
      source: "ORDER",
      reference,
    });
    if (existing) {
      entries.push({
        walletId: locked.id,
        producerId,
        credited: existing.amount,
      });
      continue;
    }

    const balance = locked.balance + amount;
    await tx.orm.public.ProducerWallet.where({ id: locked.id }).update({
      balance,
    });

    await tx.orm.public.WalletTransaction.create({
      walletId: locked.id,
      type: "CREDIT",
      source: "ORDER",
      amount,
      balanceAfter: balance,
      reference,
      description: `Harga dasar penjualan pesanan ${options.orderCode}`,
    });

    entries.push({
      walletId: locked.id,
      producerId,
      credited: amount,
    });
  }

  return { entries, orderCode: options.orderCode };
}

/**
 * Reverse a paid order (Midtrans refund/cancel after settlement). Removes
 * exactly what the order credit added and refuses when the producer already
 * withdrew the money — the webhook will retry once funds allow.
 */
export async function revokeOrderPayment(
  tx: TxClient,
  options: { orderId: number; orderCode: string; reason?: string },
): Promise<OrderPaymentRevokeResult | null> {
  const revokeRef = orderRevokeReference(options.orderCode);
  const creditRef = orderPaymentReference(options.orderCode);

  const credits = await tx.orm.public.WalletTransaction
    .where({ source: "ORDER", reference: creditRef })
    .all();

  if (credits.length === 0) return null;

  const entries: WalletRevokeEntry[] = [];

  for (const credit of credits) {
    const locked = await lockWallet(tx, credit.walletId);

    const existing = await findWalletTransaction(tx, {
      walletId: locked.id,
      source: "ADJUSTMENT",
      reference: revokeRef,
    });
    if (existing) {
      entries.push({ walletId: locked.id, revoked: Math.abs(existing.amount) });
      continue;
    }

    if (locked.balance < credit.amount) {
      throw new ApiError(
        `Saldo wallet (${locked.balance}) tidak mencukupi untuk membatalkan kredit sebesar ${credit.amount}.`,
        409,
        "WALLET_INSUFFICIENT_FOR_REVOKE",
      );
    }

    const balance = locked.balance - credit.amount;
    await tx.orm.public.ProducerWallet.where({ id: locked.id }).update({
      balance,
    });

    await tx.orm.public.WalletTransaction.create({
      walletId: locked.id,
      type: "DEBIT",
      source: "ADJUSTMENT",
      amount: -credit.amount,
      balanceAfter: balance,
      reference: revokeRef,
      description:
        options.reason ??
        `Pembayaran pesanan ${options.orderCode} dibatalkan/dirRefund`,
    });

    entries.push({ walletId: locked.id, revoked: credit.amount });
  }

  return { entries, orderCode: options.orderCode };
}

/* ------------------------------------------------------------------ */
/* Withdrawals                                                         */
/* ------------------------------------------------------------------ */

/** Producer requests a payout. No ledger side effects until admin approval. */
export async function requestWithdrawal(options: {
  userId: number;
  amount: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  note?: string;
}): Promise<{ id: number; amount: number; balance: number }> {
  const amount = Math.round(options.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError("Jumlah penarikan tidak valid.", 400, "INVALID_AMOUNT");
  }
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new ApiError(
      `Minimal penarikan Rp${MIN_WITHDRAWAL_AMOUNT.toLocaleString("id-ID")}.`,
      400,
      "WITHDRAWAL_BELOW_MINIMUM",
    );
  }

  const producer = await db.orm.public.Producer
    .where({ userId: options.userId })
    .first();
  if (!producer) {
    throw new ApiError(
      "Profil produsen belum terikat dengan akun ini.",
      404,
      "PRODUCER_NOT_FOUND",
    );
  }

  return db.transaction(async (tx) => {
    const base = await ensureWallet(tx, producer.id);
    const locked = await lockWallet(tx, base.id);

    if (locked.balance < amount) {
      throw new ApiError(
        `Saldo tidak cukup. Saldo tersedia Rp${locked.balance.toLocaleString("id-ID")}.`,
        409,
        "INSUFFICIENT_BALANCE",
      );
    }

    const request = await tx.orm.public.WithdrawalRequest.create({
      walletId: locked.id,
      amount,
      status: "PENDING",
      bankName: options.bankName,
      bankAccountName: options.bankAccountName,
      bankAccountNumber: options.bankAccountNumber,
      note: options.note?.trim() || null,
      requestedById: options.userId,
    });

    return { id: request.id, amount, balance: locked.balance };
  });
}

/** Admin approves or rejects a pending withdrawal. Balance only moves on accept. */
export async function reviewWithdrawal(options: {
  actorId: number;
  actorRole: UserRole;
  withdrawalId: number;
  approve: boolean;
  decisionNote?: string;
}): Promise<{ id: number; status: WithdrawalStatusValue }> {
  if (options.actorRole !== "ADMIN") {
    throw new ApiError(
      "Hanya admin yang dapat meninjau permintaan penarikan.",
      403,
      "WITHDRAWAL_FORBIDDEN",
    );
  }

  return db.transaction(async (tx) => {
    const pending = await tx.orm.public.WithdrawalRequest
      .where({ id: options.withdrawalId })
      .first();
    if (!pending) {
      throw new ApiError(
        "Permintaan penarikan tidak ditemukan.",
        404,
        "WITHDRAWAL_NOT_FOUND",
      );
    }

    // One lock order everywhere: wallet row first, then the withdrawal row.
    const lockedWallet = await lockWallet(tx, pending.walletId);
    const locked = await tx.orm.public.WithdrawalRequest
      .where({ id: pending.id })
      .forUpdate()
      .first();

    if (!locked) {
      throw new ApiError(
        "Permintaan penarikan tidak ditemukan.",
        404,
        "WITHDRAWAL_NOT_FOUND",
      );
    }
    if (locked.status !== "PENDING") {
      throw new ApiError(
        "Permintaan ini sudah ditinjau sebelumnya.",
        409,
        "WITHDRAWAL_ALREADY_REVIEWED",
      );
    }

    const decisionNote = options.decisionNote?.trim() || null;
    const reviewedAt = new Date().toISOString();

    if (!options.approve) {
      await tx.orm.public.WithdrawalRequest.where({ id: locked.id }).update({
        status: "REJECTED",
        decisionNote,
        reviewedById: options.actorId,
        reviewedAt,
      });
      return { id: locked.id, status: "REJECTED" as const };
    }

    if (lockedWallet.balance < locked.amount) {
      throw new ApiError(
        `Saldo wallet (${lockedWallet.balance}) tidak cukup untuk penarikan sebesar ${locked.amount}.`,
        409,
        "INSUFFICIENT_BALANCE",
      );
    }

    const balance = lockedWallet.balance - locked.amount;
    await tx.orm.public.ProducerWallet.where({ id: lockedWallet.id }).update({
      balance,
      withdrawnTotal: lockedWallet.withdrawnTotal + locked.amount,
    });

    const transaction = await tx.orm.public.WalletTransaction.create({
      walletId: lockedWallet.id,
      type: "DEBIT",
      source: "WITHDRAWAL",
      amount: -locked.amount,
      balanceAfter: balance,
      reference: withdrawalReference(locked.id),
      description: `Penarikan #${locked.id} disetujui`,
      actorId: options.actorId,
    });

    await tx.orm.public.WithdrawalRequest.where({ id: locked.id }).update({
      status: "APPROVED",
      decisionNote,
      reviewedById: options.actorId,
      reviewedAt,
      transactionId: transaction.id,
    });

    return { id: locked.id, status: "APPROVED" as const };
  });
}

/* ------------------------------------------------------------------ */
/* Views (server-side read helpers for pages)                          */
/* ------------------------------------------------------------------ */

export async function getWalletForProducer(
  userId: number,
  client: QueryClient | TxClient = db,
): Promise<{ wallet: ProducerWalletView | null; producerId: number | null }> {
  const producer = await client.orm.public.Producer
    .where({ userId })
    .first();
  if (!producer) return { wallet: null, producerId: null };

  const wallet = await client.orm.public.ProducerWallet
    .where({ producerId: producer.id })
    .first();

  return {
    wallet: {
      id: wallet?.id ?? 0,
      producerId: producer.id,
      farmName: producer.farmName,
      balance: wallet?.balance ?? 0,
      withdrawnTotal: wallet?.withdrawnTotal ?? 0,
      createdAt: wallet?.createdAt ?? producer.createdAt,
    },
    producerId: producer.id,
  };
}

export async function getWalletTransactions(
  walletId: number,
  limit = 20,
  client: QueryClient = db,
): Promise<WalletTransactionView[]> {
  if (!walletId) return [];

  const rows = await client.orm.public.WalletTransaction
    .where({ walletId })
    .orderBy((row) => row.createdAt.desc())
    .all();

  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    type: row.type as WalletTransactionView["type"],
    source: row.source as WalletTransactionView["source"],
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    reference: row.reference ?? null,
    description: row.description ?? null,
    createdAt: row.createdAt,
  }));
}

export async function getWalletWithdrawals(
  walletId: number,
  limit = 20,
  client: QueryClient = db,
): Promise<WithdrawalRequestView[]> {
  if (!walletId) return [];

  const rows = await client.orm.public.WithdrawalRequest
    .where({ walletId })
    .orderBy((row) => row.createdAt.desc())
    .all();

  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    walletId: row.walletId,
    amount: row.amount,
    status: row.status as WithdrawalStatusValue,
    bankName: row.bankName,
    bankAccountName: row.bankAccountName,
    bankAccountNumber: row.bankAccountNumber,
    note: row.note ?? null,
    decisionNote: row.decisionNote ?? null,
    requestedByName: null,
    reviewedByName: null,
    reviewedAt: row.reviewedAt ?? null,
    createdAt: row.createdAt,
  }));
}

export async function listWithdrawalsForAdmin(
  status: "PENDING" | "APPROVED" | "REJECTED",
  limit = 50,
  client: QueryClient = db,
): Promise<
  Array<
    WithdrawalRequestView & {
      walletBalance: number;
      farmName: string;
    }
  >
> {
  const rows = await client.orm.public.WithdrawalRequest
    .where({ status })
    .orderBy((row) => row.createdAt.desc())
    .all();

  const requestedUserIds = [
    ...new Set(
      rows.flatMap((row) =>
        [row.requestedById, row.reviewedById].filter(
          (id): id is number => id !== null,
        ),
      ),
    ),
  ];

  // Only fetch the exact users referenced by these withdrawal rows; roster
  // tables can grow and wallet pages must not leak unrelated names.
  const users = (
    await Promise.all(
      requestedUserIds.map(async (id) =>
        client.orm.public.User.where({ id }).select("id", "name").first(),
      ),
    )
  ).filter((user): user is NonNullable<typeof user> => user !== null);
  const userById = new Map(users.map((user) => [user.id, user.name ?? null]));

  const wallets = (
    await Promise.all(
      [...new Set(rows.map((row) => row.walletId))].map(async (walletId) =>
        client.orm.public.ProducerWallet.where({ id: walletId }).first(),
      ),
    )
  ).filter(
    (wallet): wallet is NonNullable<typeof wallet> => wallet !== null,
  );
  const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));

  const producerIds = [
    ...new Set(wallets.map((wallet) => wallet.producerId)),
  ];
  const producers = (
    await Promise.all(
      producerIds.map(async (producerId) =>
        client.orm.public.Producer.where({ id: producerId })
          .select("id", "farmName")
          .first(),
      ),
    )
  ).filter(
    (producer): producer is NonNullable<typeof producer> => producer !== null,
  );
  const producerById = new Map(
    producers.map((producer) => [producer.id, producer.farmName]),
  );

  return rows.slice(0, limit).map((row) => {
    const wallet = walletById.get(row.walletId);
    return {
      id: row.id,
      walletId: row.walletId,
      amount: row.amount,
      status: row.status as WithdrawalStatusValue,
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      note: row.note ?? null,
      decisionNote: row.decisionNote ?? null,
      requestedByName: row.requestedById
        ? userById.get(row.requestedById) ?? null
        : null,
      reviewedByName: row.reviewedById
        ? userById.get(row.reviewedById) ?? null
        : null,
      reviewedAt: row.reviewedAt ?? null,
      createdAt: row.createdAt,
      walletBalance: wallet?.balance ?? 0,
      farmName: wallet
        ? producerById.get(wallet.producerId) ?? "—"
        : "—",
    };
  });
}
