#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a931a850fc112bc9a499a0eee007f0f1bfa68e9d9822dc2b852c48535da67b54/contract';
import endContract from '../../snapshots/a931a850fc112bc9a499a0eee007f0f1bfa68e9d9822dc2b852c48535da67b54/contract.json' with { type: 'json' };
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

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Batch',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('freshnessScore', 'float8', {
            notNull: true,
            default: lit(100),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('harvestDate', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isManuallyAdjusted', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('qualityNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantityKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('receivedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('reservedKg', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('FRESH'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('storageTempC', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('warehouseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Batch_status_check_33b62ecc',
            sql`"status" IN ('FRESH', 'RESCUE', 'FEED', 'RESIDUE', 'DISPOSED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'BuyerTier',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('earlyAccessHours', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('points', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('rescueQuotaPerWeek', 'int4', {
            notNull: true,
            default: lit(2),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tier', 'text', {
            notNull: true,
            default: lit('STARTER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('totalSpend30d', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'BuyerTier_tier_check_dd0be335',
            sql`"tier" IN ('STARTER', 'SILVER', 'GOLD', 'PLATINUM')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'CascadeEvent',
        columns: [
          col('actorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('freshnessScore', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'CascadeEvent_fromStatus_check_727f5fdb',
            sql`"fromStatus" IN ('FRESH', 'RESCUE', 'FEED', 'RESIDUE', 'DISPOSED')`,
          ),
          checkExpression(
            'CascadeEvent_toStatus_check_1614c35c',
            sql`"toStatus" IN ('FRESH', 'RESCUE', 'FEED', 'RESIDUE', 'DISPOSED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'FeedListing',
        columns: [
          col('availableKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('pricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('suitableFor', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ImpactLog',
        columns: [
          col('batchId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('cascadeEventId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('co2eSavedKg', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('rescuedKg', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('wasteDivertedKg', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('waterSavedLiters', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'LoyaltyLedger',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('pointsDelta', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LoyaltyLedger_type_check_ad4d745d',
            sql`"type" IN ('EARN', 'REDEEM', 'ADJUST')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Order',
        columns: [
          col('buyerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deliveryAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('discount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('REGULAR'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('paymentProvider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paymentUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('scheduledFor', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tierAtPurchase', 'text', {
            notNull: true,
            default: lit('STARTER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('total', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('Order_kind_check_308ecb6a', sql`"kind" IN ('REGULAR', 'PREORDER')`),
          checkExpression(
            'Order_status_check_e158e2c8',
            sql`"status" IN ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED')`,
          ),
          checkExpression(
            'Order_tierAtPurchase_check_abd4a247',
            sql`"tierAtPurchase" IN ('STARTER', 'SILVER', 'GOLD', 'PLATINUM')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'OrderItem',
        columns: [
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lineTotal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('pricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantityKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('stage', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'OrderItem_stage_check_a769dd26',
            sql`"stage" IN ('FRESH', 'RESCUE', 'FEED', 'RESIDUE', 'DISPOSED')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Post',
        columns: [
          col('authorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PriceBreakdown',
        columns: [
          col('basePricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('finalPricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('logisticsCostPerKg', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('marginPerKg', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('rescueDiscountPct', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('warehouseCostPerKg', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Producer',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('farmName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Product',
        columns: [
          col('basePricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('idealTempC', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('producerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('shelfLifeDays', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unit', 'text', {
            notNull: true,
            default: lit('kg'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Product_category_check_186afa37',
            sql`"category" IN ('VEGETABLE', 'FRUIT', 'PROTEIN', 'STAPLE', 'HERB', 'OTHER')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'RescueDeal',
        columns: [
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('discountPct', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('earlyAccessHours', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('rescuePricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RescueQuotaUsage',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('used', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('weekStart', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ResidueListing',
        columns: [
          col('availableKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('pricePerKg', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('processingType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('username', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'User_role_check_afcc0395',
            sql`"role" IN ('ADMIN', 'PRODUCER', 'WAREHOUSE', 'CONSUMER', 'BUSINESS')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Warehouse',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('capacityKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('managerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Batch',
        constraint: 'Batch_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'BuyerTier',
        constraint: 'BuyerTier_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'FeedListing',
        constraint: 'FeedListing_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Order',
        constraint: 'Order_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'OrderItem',
        constraint: 'OrderItem_orderId_batchId_key',
        columns: ['orderId', 'batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PriceBreakdown',
        constraint: 'PriceBreakdown_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Producer',
        constraint: 'Producer_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RescueDeal',
        constraint: 'RescueDeal_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RescueQuotaUsage',
        constraint: 'RescueQuotaUsage_userId_weekStart_key',
        columns: ['userId', 'weekStart'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ResidueListing',
        constraint: 'ResidueListing_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Batch',
        index: 'Batch_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Batch',
        index: 'Batch_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Batch',
        index: 'Batch_warehouseId_idx_8ff93e70',
        columns: ['warehouseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'BuyerTier',
        index: 'BuyerTier_tier_idx_4627c10f',
        columns: ['tier'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CascadeEvent',
        index: 'CascadeEvent_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CascadeEvent',
        index: 'CascadeEvent_batchId_idx_84d4b0b9',
        columns: ['batchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'FeedListing',
        index: 'FeedListing_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ImpactLog',
        index: 'ImpactLog_batchId_idx_84d4b0b9',
        columns: ['batchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ImpactLog',
        index: 'ImpactLog_cascadeEventId_idx_db66e97c',
        columns: ['cascadeEventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ImpactLog',
        index: 'ImpactLog_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LoyaltyLedger',
        index: 'LoyaltyLedger_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LoyaltyLedger',
        index: 'LoyaltyLedger_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Order',
        index: 'Order_buyerId_idx_80be0de9',
        columns: ['buyerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Order',
        index: 'Order_buyerId_kind_idx_d1607eab',
        columns: ['buyerId', 'kind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Order',
        index: 'Order_kind_idx_c9ca668f',
        columns: ['kind'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Order',
        index: 'Order_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrderItem',
        index: 'OrderItem_batchId_idx_84d4b0b9',
        columns: ['batchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OrderItem',
        index: 'OrderItem_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Post',
        index: 'Post_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_category_idx_f2600f8e',
        columns: ['category'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Product',
        index: 'Product_producerId_idx_a32fa932',
        columns: ['producerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RescueDeal',
        index: 'RescueDeal_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RescueQuotaUsage',
        index: 'RescueQuotaUsage_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ResidueListing',
        index: 'ResidueListing_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Warehouse',
        index: 'Warehouse_managerId_idx_f8369ba6',
        columns: ['managerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Batch',
        foreignKey: {
          name: 'Batch_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'Product', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Batch',
        foreignKey: {
          name: 'Batch_warehouseId_fkey',
          columns: ['warehouseId'],
          references: { schema: 'public', table: 'Warehouse', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BuyerTier',
        foreignKey: {
          name: 'BuyerTier_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CascadeEvent',
        foreignKey: {
          name: 'CascadeEvent_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CascadeEvent',
        foreignKey: {
          name: 'CascadeEvent_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'FeedListing',
        foreignKey: {
          name: 'FeedListing_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ImpactLog',
        foreignKey: {
          name: 'ImpactLog_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ImpactLog',
        foreignKey: {
          name: 'ImpactLog_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'Order', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ImpactLog',
        foreignKey: {
          name: 'ImpactLog_cascadeEventId_fkey',
          columns: ['cascadeEventId'],
          references: { schema: 'public', table: 'CascadeEvent', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LoyaltyLedger',
        foreignKey: {
          name: 'LoyaltyLedger_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LoyaltyLedger',
        foreignKey: {
          name: 'LoyaltyLedger_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'Order', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Order',
        foreignKey: {
          name: 'Order_buyerId_fkey',
          columns: ['buyerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrderItem',
        foreignKey: {
          name: 'OrderItem_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'Order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OrderItem',
        foreignKey: {
          name: 'OrderItem_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Post',
        foreignKey: {
          name: 'Post_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PriceBreakdown',
        foreignKey: {
          name: 'PriceBreakdown_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Producer',
        foreignKey: {
          name: 'Producer_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Product',
        foreignKey: {
          name: 'Product_producerId_fkey',
          columns: ['producerId'],
          references: { schema: 'public', table: 'Producer', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RescueDeal',
        foreignKey: {
          name: 'RescueDeal_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RescueQuotaUsage',
        foreignKey: {
          name: 'RescueQuotaUsage_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ResidueListing',
        foreignKey: {
          name: 'ResidueListing_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'Batch', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Warehouse',
        foreignKey: {
          name: 'Warehouse_managerId_fkey',
          columns: ['managerId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
