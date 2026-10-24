#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4e6a15622fb62ea929ecba868f1a0324c0e0216546aa393d6dc620ed5d586960/contract';
import endContract from '../../snapshots/4e6a15622fb62ea929ecba868f1a0324c0e0216546aa393d6dc620ed5d586960/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/98e72e41a2fa5341924fead770a7640eb047360e1e48eae01e035a93ecd2d5e6/contract';
import startContract from '../../snapshots/98e72e41a2fa5341924fead770a7640eb047360e1e48eae01e035a93ecd2d5e6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('deliveryCity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('deliveryMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('estimatedDeliveryAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
