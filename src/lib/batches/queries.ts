import { db } from "@/src/prisma/db";
import type { SessionUser } from "@/src/lib/auth/session";

export async function getProducerForUser(userId: string | number) {
  return db.orm.public.Producer.where({
    userId: Number(userId),
  }).first();
}

async function queryBatchesForUser(user: SessionUser) {
  const base = db.orm.public.Batch
    .include("product", (product) =>
      product.select(
        "id",
        "name",
        "category",
        "unit",
        "shelfLifeDays",
        "idealTempC",
        "basePricePerKg",
        "producerId",
      ),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city"),
    )
    .include("priceBreakdown")
    .orderBy((batch) => batch.createdAt.desc());

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer) return [];
    return base
      .where((batch) =>
        batch.product.some((product) => product.producerId.eq(producer.id)),
      )
      .all();
  }

  if (user.role === "WAREHOUSE") {
    return base
      .where((batch) =>
        batch.warehouse.some((warehouse) =>
          warehouse.managerId.eq(Number(user.id)),
        ),
      )
      .all();
  }

  if (user.role === "ADMIN") {
    return base.all();
  }

  return [];
}

type RawBatchListItem = Awaited<
  ReturnType<typeof queryBatchesForUser>
>[number];

export type BatchListItem = Omit<RawBatchListItem, "product" | "warehouse"> & {
  product: NonNullable<RawBatchListItem["product"]>;
  warehouse: NonNullable<RawBatchListItem["warehouse"]>;
};

export async function getBatchesForUser(
  user: SessionUser,
): Promise<BatchListItem[]> {
  const rows = await queryBatchesForUser(user);
  return rows.filter(
    (batch): batch is BatchListItem =>
      batch.product !== null && batch.warehouse !== null,
  );
}

export async function getBatchById(id: number) {
  return db.orm.public.Batch.where({ id })
    .include("product", (product) =>
      product.select(
        "id",
        "name",
        "category",
        "unit",
        "description",
        "shelfLifeDays",
        "idealTempC",
        "basePricePerKg",
        "producerId",
      ),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city", "managerId"),
    )
    .include("priceBreakdown")
    .include("cascadeEvents", (events) =>
      events.orderBy((event) => event.createdAt.desc()),
    )
    .include("orderItems")
    .include("impactLogs")
    .first();
}

export type BatchDetail = NonNullable<
  Awaited<ReturnType<typeof getBatchById>>
>;

export function batchHasRefs(
  batch: BatchDetail,
): batch is BatchDetail & {
  product: NonNullable<BatchDetail["product"]>;
  warehouse: NonNullable<BatchDetail["warehouse"]>;
} {
  return batch.product !== null && batch.warehouse !== null;
}

export function canAccessBatch(
  user: SessionUser,
  batch: BatchDetail,
  producerId: number | null,
): boolean {
  if (!batch.product || !batch.warehouse) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "PRODUCER") {
    return producerId !== null && producerId === batch.product.producerId;
  }
  if (user.role === "WAREHOUSE") {
    return batch.warehouse.managerId === Number(user.id);
  }
  return false;
}

export async function getProductsForUser(user: SessionUser) {
  const base = db.orm.public.Product
    .select(
      "id",
      "name",
      "category",
      "unit",
      "shelfLifeDays",
      "idealTempC",
      "basePricePerKg",
      "producerId",
    )
    .orderBy((product) => product.name.asc());

  if (user.role === "PRODUCER") {
    const producer = await getProducerForUser(user.id);
    if (!producer) return [];
    return base.where({ producerId: producer.id }).all();
  }

  if (user.role === "ADMIN") {
    return base.all();
  }

  return [];
}

export async function getWarehouses() {
  return db.orm.public.Warehouse
    .select("id", "name", "city", "capacityKg")
    .orderBy((warehouse) => warehouse.name.asc())
    .all();
}

export async function getProducerById(id: number) {
  return db.orm.public.Producer.where({ id }).first();
}
