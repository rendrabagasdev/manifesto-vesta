#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3590ab7388b37bbcd417a972a2c2ab7ccbd405876c1a2655db4cda9f3faa9b91/contract';
import endContract from '../../snapshots/3590ab7388b37bbcd417a972a2c2ab7ccbd405876c1a2655db4cda9f3faa9b91/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b7ea73eaef6994f9a68c6f7e85b49378c1391703fc8454ee610dc5310803f070/contract';
import startContract from '../../snapshots/b7ea73eaef6994f9a68c6f7e85b49378c1391703fc8454ee610dc5310803f070/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('deliveryDistanceKm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('deliveryDurationMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('deliveryLatitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('deliveryLongitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Producer',
        column: col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Producer',
        column: col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Warehouse',
        column: col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Warehouse',
        column: col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
