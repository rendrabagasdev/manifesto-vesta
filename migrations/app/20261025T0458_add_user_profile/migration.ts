#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4e6a15622fb62ea929ecba868f1a0324c0e0216546aa393d6dc620ed5d586960/contract';
import startContract from '../../snapshots/4e6a15622fb62ea929ecba868f1a0324c0e0216546aa393d6dc620ed5d586960/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b7ea73eaef6994f9a68c6f7e85b49378c1391703fc8454ee610dc5310803f070/contract';
import endContract from '../../snapshots/b7ea73eaef6994f9a68c6f7e85b49378c1391703fc8454ee610dc5310803f070/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
