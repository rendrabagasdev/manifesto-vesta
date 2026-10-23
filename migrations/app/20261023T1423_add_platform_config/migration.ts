#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/98e72e41a2fa5341924fead770a7640eb047360e1e48eae01e035a93ecd2d5e6/contract';
import endContract from '../../snapshots/98e72e41a2fa5341924fead770a7640eb047360e1e48eae01e035a93ecd2d5e6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a931a850fc112bc9a499a0eee007f0f1bfa68e9d9822dc2b852c48535da67b54/contract';
import startContract from '../../snapshots/a931a850fc112bc9a499a0eee007f0f1bfa68e9d9822dc2b852c48535da67b54/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
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
        table: 'PlatformConfig',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('earlyAccessWindowHours', 'int4', {
            notNull: true,
            default: lit(12),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('feedTimerHours', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('freshTimerHours', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'int4', { notNull: true, default: lit(1), codecRef: { codecId: 'pg/int4@1' } }),
          col('logisticsCostPerKg', 'int4', {
            notNull: true,
            default: lit(1500),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('marginPerKg', 'int4', {
            notNull: true,
            default: lit(2000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('rescueDealDurationHours', 'int4', {
            notNull: true,
            default: lit(48),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('rescueTimerHours', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('residueTimerHours', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('thresholdFeed', 'int4', {
            notNull: true,
            default: lit(10),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('thresholdFresh', 'int4', {
            notNull: true,
            default: lit(70),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('thresholdRescue', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('thresholdResidue', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('updatedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('warehouseCostPerKg', 'int4', {
            notNull: true,
            default: lit(1000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
