import { db } from "@/src/prisma/db";
import { ApiError } from "@/src/lib/api/http";
import type { UserRole } from "@/src/lib/auth/roles";

type QueryClient = Pick<typeof db, "orm">;
type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface Fulfiller {
  id: number | string;
  role: UserRole;
}

export interface FulfillmentItemView {
  id: number;
  batchId: number;
  batchCode: string;
  productName: string;
  unit: string;
  warehouseId: number;
  warehouseName: string;
  quantityKg: number;
  pricePerKg: number;
  lineTotal: number;
  stage: string;
}

export interface FulfillmentOrderView {
  id: number;
  code: string;
  status: "PAID" | "SHIPPED";
  kind: string;
  total: number;
  createdAt: string;
  paidAt: string | null;
  scheduledFor: string | null;
  deliveryAddress: string | null;
  contactPhone: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  items: FulfillmentItemView[];
}

function fulfillerId(user: Fulfiller): number {
  const id = Number(user.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError("Sesi pengguna tidak valid.", 401, "INVALID_SESSION");
  }
  return id;
}

async function assertWarehouseScope(
  client: QueryClient | TxClient,
  user: Fulfiller,
  warehouseIds: readonly number[],
): Promise<void> {
  if (user.role === "ADMIN") return;
  if (user.role !== "WAREHOUSE") {
    throw new ApiError(
      "Hanya admin atau petugas gudang yang dapat memproses pesanan.",
      403,
      "ORDER_FORBIDDEN",
    );
  }

  const managed = await client.orm.public.Warehouse
    .where({ managerId: fulfillerId(user) })
    .select("id")
    .all();
  const managedIds = new Set(managed.map((warehouse) => warehouse.id));
  const outside = warehouseIds.some((id) => !managedIds.has(id));

  if (outside) {
    throw new ApiError(
      "Pesanan ini bukan untuk gudang yang Anda kelola.",
      403,
      "ORDER_OUT_OF_SCOPE",
    );
  }
}

function toOrderView(
  order: Awaited<ReturnType<typeof queryFulfillmentOrders>>[number],
): FulfillmentOrderView | null {
  const items: FulfillmentItemView[] = [];

  for (const item of order.items) {
    const batch = item.batch;
    const product = batch?.product;
    const warehouse = batch?.warehouse;
    if (!batch || !product || !warehouse) continue;

    items.push({
      id: item.id,
      batchId: batch.id,
      batchCode: batch.code,
      productName: product.name,
      unit: product.unit,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      lineTotal: item.lineTotal,
      stage: item.stage,
    });
  }

  if (items.length === 0) return null;

  return {
    id: order.id,
    code: order.code,
    status: order.status as FulfillmentOrderView["status"],
    kind: order.kind,
    total: order.total,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    scheduledFor: order.scheduledFor,
    deliveryAddress: order.deliveryAddress,
    contactPhone: order.contactPhone,
    buyerName: order.buyer?.name ?? null,
    buyerEmail: order.buyer?.email ?? null,
    items,
  };
}

async function queryFulfillmentOrders(
  client: QueryClient,
  status: "PAID" | "SHIPPED",
) {
  return client.orm.public.Order
    .where({ status })
    .include("buyer", (buyer) => buyer.select("id", "name", "email"))
    .include("items", (items) =>
      items.include("batch", (batch) =>
        batch
          .include("product", (product) =>
            product.select("id", "name", "unit"),
          )
          .include("warehouse", (warehouse) =>
            warehouse.select("id", "name", "managerId"),
          ),
      ),
    )
    .orderBy((order) => order.createdAt.desc())
    .all();
}

/**
 * Orders waiting for warehouse action: PAID orders to ship and SHIPPED orders
 * waiting to be completed. WAREHOUSE users only see orders whose every line
 * belongs to a warehouse they manage, so they can release all stock safely.
 */
export async function getFulfillmentOrders(
  user: Fulfiller,
  client: QueryClient = db,
): Promise<FulfillmentOrderView[]> {
  if (user.role !== "ADMIN" && user.role !== "WAREHOUSE") return [];

  const [paid, shipped] = await Promise.all([
    queryFulfillmentOrders(client, "PAID"),
    queryFulfillmentOrders(client, "SHIPPED"),
  ]);

  const views = [...paid, ...shipped]
    .map(toOrderView)
    .filter((view): view is FulfillmentOrderView => view !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (user.role === "ADMIN") return views;

  const managed = await client.orm.public.Warehouse
    .where({ managerId: fulfillerId(user) })
    .select("id")
    .all();
  const managedIds = new Set(managed.map((warehouse) => warehouse.id));

  return views.filter((order) =>
    order.items.every((item) => managedIds.has(item.warehouseId)),
  );
}

/**
 * PAID → SHIPPED. Locks the order and every batch, validates the warehouse
 * scope, then releases the reservation into an actual stock decrement.
 */
export async function shipOrder(
  user: Fulfiller,
  orderId: number,
): Promise<{ code: string }> {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new ApiError("Pesanan tidak valid.", 400, "INVALID_ORDER");
  }

  return db.transaction(async (tx) => {
    const order = await tx.orm.public.Order.where({ id: orderId })
      .forUpdate()
      .first();

    if (!order) {
      throw new ApiError("Pesanan tidak ditemukan.", 404, "ORDER_NOT_FOUND");
    }
    if (order.status === "SHIPPED") {
      throw new ApiError("Pesanan ini sudah dikirim.", 409, "ORDER_ALREADY_SHIPPED");
    }
    if (order.status !== "PAID") {
      throw new ApiError(
        "Hanya pesanan yang sudah dibayar yang dapat dikirim.",
        409,
        "ORDER_NOT_PAID",
      );
    }

    const items = await tx.orm.public.OrderItem.where({ orderId }).all();
    if (items.length === 0) {
      throw new ApiError("Pesanan tidak memiliki item.", 409, "ORDER_EMPTY");
    }

    const locked: Array<{ item: (typeof items)[number]; batch: NonNullable<Awaited<ReturnType<typeof loadBatchForUpdate>>> }> = [];

    for (const item of [...items].sort((a, b) => a.batchId - b.batchId)) {
      const batch = await loadBatchForUpdate(tx, item.batchId);
      if (!batch) {
        throw new ApiError(
          `Batch #${item.batchId} pada pesanan tidak ditemukan.`,
          409,
          "BATCH_NOT_FOUND",
        );
      }
      locked.push({ item, batch });
    }

    await assertWarehouseScope(
      tx,
      user,
      locked.map(({ batch }) => batch.warehouseId),
    );

    for (const { item, batch } of locked) {
      if (batch.quantityKg < item.quantityKg) {
        throw new ApiError(
          `Stok batch ${batch.code} tidak mencukupi untuk pesanan ini.`,
          409,
          "STOCK_CONFLICT",
        );
      }
      if (batch.reservedKg < item.quantityKg) {
        throw new ApiError(
          `Reservasi batch ${batch.code} tidak mencukupi untuk pesanan ini.`,
          409,
          "RESERVATION_MISMATCH",
        );
      }

      await tx.orm.public.Batch.where({ id: batch.id }).update({
        quantityKg: batch.quantityKg - item.quantityKg,
        reservedKg: batch.reservedKg - item.quantityKg,
      });
    }

    await tx.orm.public.Order.where({ id: order.id }).update({
      status: "SHIPPED",
    });

    return { code: order.code };
  });
}

async function loadBatchForUpdate(tx: TxClient, batchId: number) {
  return tx.orm.public.Batch.where({ id: batchId }).forUpdate().first();
}

/** SHIPPED → COMPLETED. No stock changes; stock left the warehouse on shipping. */
export async function completeOrder(
  user: Fulfiller,
  orderId: number,
): Promise<{ code: string }> {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new ApiError("Pesanan tidak valid.", 400, "INVALID_ORDER");
  }

  return db.transaction(async (tx) => {
    const order = await tx.orm.public.Order.where({ id: orderId })
      .forUpdate()
      .first();

    if (!order) {
      throw new ApiError("Pesanan tidak ditemukan.", 404, "ORDER_NOT_FOUND");
    }
    if (order.status !== "SHIPPED") {
      throw new ApiError(
        "Hanya pesanan yang sudah dikirim yang dapat diselesaikan.",
        409,
        "ORDER_NOT_SHIPPED",
      );
    }

    const items = await tx.orm.public.OrderItem.where({ orderId }).all();
    if (items.length === 0) {
      throw new ApiError("Pesanan tidak memiliki item.", 409, "ORDER_EMPTY");
    }

    const warehouseIds: number[] = [];
    for (const item of items) {
      const batch = await tx.orm.public.Batch.where({ id: item.batchId }).first();
      if (!batch) {
        throw new ApiError(
          `Batch #${item.batchId} pada pesanan tidak ditemukan.`,
          409,
          "BATCH_NOT_FOUND",
        );
      }
      warehouseIds.push(batch.warehouseId);
    }

    await assertWarehouseScope(tx, user, warehouseIds);

    await tx.orm.public.Order.where({ id: order.id }).update({
      status: "COMPLETED",
    });

    return { code: order.code };
  });
}
