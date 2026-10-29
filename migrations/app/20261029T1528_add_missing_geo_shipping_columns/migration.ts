#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/c49ac54cf17a4dbd91a8d2e7d67fa7e8bd52e023ffad6d1c86a10c99c6b04727/contract';
import startContract from '../../snapshots/c49ac54cf17a4dbd91a8d2e7d67fa7e8bd52e023ffad6d1c86a10c99c6b04727/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d08cb54a3297fab65d1a1f8a813426eb7598431b120f7145053a6ebbb5a4b402/contract';
import endContract from '../../snapshots/d08cb54a3297fab65d1a1f8a813426eb7598431b120f7145053a6ebbb5a4b402/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

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
        table: 'Order',
        column: col('shippingCost', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
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
