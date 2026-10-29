#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3590ab7388b37bbcd417a972a2c2ab7ccbd405876c1a2655db4cda9f3faa9b91/contract';
import startContract from '../../snapshots/3590ab7388b37bbcd417a972a2c2ab7ccbd405876c1a2655db4cda9f3faa9b91/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f704f2e476fb59687fa9e76f957e3cee9b932f55eb20900577a64fe24eec70be/contract';
import endContract from '../../snapshots/f704f2e476fb59687fa9e76f957e3cee9b932f55eb20900577a64fe24eec70be/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Order',
        column: col('shippingCost', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
