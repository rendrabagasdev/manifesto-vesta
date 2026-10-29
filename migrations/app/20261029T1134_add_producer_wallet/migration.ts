#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b7ea73eaef6994f9a68c6f7e85b49378c1391703fc8454ee610dc5310803f070/contract';
import startContract from '../../snapshots/b7ea73eaef6994f9a68c6f7e85b49378c1391703fc8454ee610dc5310803f070/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c49ac54cf17a4dbd91a8d2e7d67fa7e8bd52e023ffad6d1c86a10c99c6b04727/contract';
import endContract from '../../snapshots/c49ac54cf17a4dbd91a8d2e7d67fa7e8bd52e023ffad6d1c86a10c99c6b04727/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ProducerWallet',
        columns: [
          col('balance', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('producerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('withdrawnTotal', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WalletTransaction',
        columns: [
          col('actorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('balanceAfter', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('ADJUSTMENT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('walletId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WalletTransaction_source_check_74de9c4f',
            sql`"source" IN ('ORDER', 'WITHDRAWAL', 'ADJUSTMENT')`,
          ),
          checkExpression(
            'WalletTransaction_type_check_e3a9320e',
            sql`"type" IN ('CREDIT', 'DEBIT')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'WithdrawalRequest',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('bankAccountName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('bankAccountNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('bankName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('decisionNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requestedById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reviewedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('reviewedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transactionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('walletId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'WithdrawalRequest_status_check_56005a61',
            sql`"status" IN ('PENDING', 'APPROVED', 'REJECTED')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ProducerWallet',
        constraint: 'ProducerWallet_producerId_key',
        columns: ['producerId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'WalletTransaction',
        constraint: 'WalletTransaction_walletId_source_reference_key',
        columns: ['walletId', 'source', 'reference'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WalletTransaction',
        index: 'WalletTransaction_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WalletTransaction',
        index: 'WalletTransaction_walletId_idx_2e003173',
        columns: ['walletId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WithdrawalRequest',
        index: 'WithdrawalRequest_requestedById_idx_f9a56c66',
        columns: ['requestedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WithdrawalRequest',
        index: 'WithdrawalRequest_reviewedById_idx_e2835478',
        columns: ['reviewedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WithdrawalRequest',
        index: 'WithdrawalRequest_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WithdrawalRequest',
        index: 'WithdrawalRequest_walletId_idx_2e003173',
        columns: ['walletId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ProducerWallet',
        foreignKey: {
          name: 'ProducerWallet_producerId_fkey',
          columns: ['producerId'],
          references: { schema: 'public', table: 'Producer', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WalletTransaction',
        foreignKey: {
          name: 'WalletTransaction_walletId_fkey',
          columns: ['walletId'],
          references: { schema: 'public', table: 'ProducerWallet', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WalletTransaction',
        foreignKey: {
          name: 'WalletTransaction_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WithdrawalRequest',
        foreignKey: {
          name: 'WithdrawalRequest_walletId_fkey',
          columns: ['walletId'],
          references: { schema: 'public', table: 'ProducerWallet', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WithdrawalRequest',
        foreignKey: {
          name: 'WithdrawalRequest_requestedById_fkey',
          columns: ['requestedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WithdrawalRequest',
        foreignKey: {
          name: 'WithdrawalRequest_reviewedById_fkey',
          columns: ['reviewedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
