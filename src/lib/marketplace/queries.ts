import { db } from "@/src/prisma/db";
import { getDealAccess, type RescueDealWindow } from "@/src/lib/pricing/rescue";
import {
  getQuotaStatus,
  type QuotaStatus,
} from "@/src/lib/loyalty/tiers";
import { getImpactSummary, type ImpactSummary } from "@/src/lib/impact/ledger";
import { calculateProducerShareForItem } from "@/src/lib/wallet/share";

type QueryClient = Pick<typeof db, "orm">;

export interface MarketplaceListing {
  batchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  category: string;
  unit: string;
  productDescription: string | null;
  imageUrl: string | null;
  warehouseName: string;
  warehouseCity: string | null;
  producerFarmName: string | null;
  freshnessScore: number;
  quantityKg: number;
  availableKg: number;
  harvestDate: string;
  pricePerKg: number;
  basePricePerKg: number;
}

export async function getFreshListings(
  client: QueryClient = db,
): Promise<MarketplaceListing[]> {
  const batches = await client.orm.public.Batch
    .where({ status: "FRESH" })
    .include("product", (product) =>
      product
        .include("producer", (producer) => producer.select("id", "farmName"))
        .select(
          "id",
          "name",
          "category",
          "unit",
          "description",
          "imageUrl",
          "basePricePerKg",
          "producerId",
        ),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city"),
    )
    .include("priceBreakdown")
    .orderBy((batch) => batch.createdAt.desc())
    .all();

  return batches
    .filter(
      (batch): batch is typeof batch & {
        product: NonNullable<typeof batch.product> & {
          producer: NonNullable<NonNullable<typeof batch.product>["producer"]>;
        };
        warehouse: NonNullable<typeof batch.warehouse>;
        priceBreakdown: NonNullable<typeof batch.priceBreakdown>;
      } =>
        batch.product !== null &&
        batch.warehouse !== null &&
        batch.priceBreakdown !== null,
    )
    .map((batch) => {
      const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);

      return {
        batchId: batch.id,
        batchCode: batch.code,
        productId: batch.product.id,
        productName: batch.product.name,
        category: batch.product.category,
        unit: batch.product.unit,
        productDescription: batch.product.description,
        imageUrl: batch.product.imageUrl,
        warehouseName: batch.warehouse.name,
        warehouseCity: batch.warehouse.city,
        producerFarmName: batch.product.producer?.farmName ?? null,
        freshnessScore: batch.freshnessScore,
        quantityKg: batch.quantityKg,
        availableKg,
        harvestDate: batch.harvestDate,
        pricePerKg: batch.priceBreakdown.finalPricePerKg,
        basePricePerKg: batch.priceBreakdown.basePricePerKg,
      };
    })
    .filter((listing) => listing.availableKg > 0);
}

export interface RescueDealView {
  id: number;
  batchId: number;
  batchCode: string;
  productName: string;
  category: string;
  unit: string;
  imageUrl: string | null;
  warehouseName: string;
  warehouseCity: string | null;
  freshnessScore: number;
  discountPct: number;
  rescuePricePerKg: number;
  originalPricePerKg: number;
  availableKg: number;
  discountLabel: string;
  startsAt: string;
  endsAt: string;
  dealEarlyAccessHours: number;
  access: ReturnType<typeof getDealAccess>;
}

function discountLabelFor(score: number): string {
  if (score >= 50) return "Diskon ringan";
  if (score >= 30) return "Diskon sedang";
  return "Diskon darurat";
}

export async function getRescueDeals(
  client: QueryClient = db,
): Promise<RescueDealView[]> {
  const deals = await client.orm.public.RescueDeal
    .where({ isActive: true })
    .include("batch", (batch) =>
      batch
        .include("product", (product) =>
          product.select(
            "id",
            "name",
            "category",
            "unit",
            "imageUrl",
            "basePricePerKg",
          ),
        )
        .include("warehouse", (warehouse) =>
          warehouse.select("id", "name", "city"),
        )
        .include("priceBreakdown"),
    )
    .orderBy((deal) => deal.endsAt.asc())
    .all();

  const now = new Date();

  return deals
    .filter(
      (deal): deal is typeof deal & {
        batch: NonNullable<typeof deal.batch> & {
          product: NonNullable<
            NonNullable<typeof deal.batch>["product"]
          >;
          warehouse: NonNullable<
            NonNullable<typeof deal.batch>["warehouse"]
          >;
          priceBreakdown: NonNullable<
            NonNullable<typeof deal.batch>["priceBreakdown"]
          >;
        };
      } =>
        deal.batch !== null &&
        deal.batch.product !== null &&
        deal.batch.warehouse !== null &&
        deal.batch.priceBreakdown !== null,
    )
    .map((deal) => {
      const batch = deal.batch;
      const availableKg = Math.max(0, batch.quantityKg - batch.reservedKg);
      const breakdown = batch.priceBreakdown;
      const originalPricePerKg =
        breakdown.basePricePerKg +
        breakdown.warehouseCostPerKg +
        breakdown.logisticsCostPerKg +
        breakdown.marginPerKg;
      const discountPct =
        originalPricePerKg > 0
          ? Math.max(
              0,
              Math.round(
                (1 - deal.rescuePricePerKg / originalPricePerKg) * 1000,
              ) / 10,
            )
          : 0;

      return {
        id: deal.id,
        batchId: batch.id,
        batchCode: batch.code,
        productName: batch.product.name,
        category: batch.product.category,
        unit: batch.product.unit,
        imageUrl: batch.product.imageUrl,
        warehouseName: batch.warehouse.name,
        warehouseCity: batch.warehouse.city,
        freshnessScore: batch.freshnessScore,
        discountPct,
        rescuePricePerKg: deal.rescuePricePerKg,
        originalPricePerKg,
        availableKg,
        discountLabel: discountLabelFor(batch.freshnessScore),
        startsAt: deal.startsAt,
        endsAt: deal.endsAt,
        dealEarlyAccessHours: deal.earlyAccessHours,
        access: getDealAccess(
          {
            startsAt: deal.startsAt,
            endsAt: deal.endsAt,
            earlyAccessHours: deal.earlyAccessHours,
          } satisfies RescueDealWindow,
          0,
          now,
          deal.isActive,
        ),
      };
    })
    .filter((deal) => deal.availableKg > 0);
}

export interface SimpleListing {
  id: number;
  batchId: number;
  batchCode: string;
  productName: string;
  category: string;
  unit: string;
  imageUrl: string | null;
  warehouseName: string;
  warehouseCity: string | null;
  pricePerKg: number;
  availableKg: number;
  tag: string | null;
  description: string | null;
  freshnessScore: number;
}

export async function getFeedListings(
  client: QueryClient = db,
): Promise<SimpleListing[]> {
  const listings = await client.orm.public.FeedListing
    .where({ isActive: true })
    .include("batch", (batch) =>
      batch
        .include("product", (product) =>
          product.select("id", "name", "category", "unit", "imageUrl"),
        )
        .include("warehouse", (warehouse) =>
          warehouse.select("id", "name", "city"),
        ),
    )
    .orderBy((listing) => listing.createdAt.desc())
    .all();

  return listings
    .filter(
      (listing): listing is typeof listing & {
        batch: NonNullable<typeof listing.batch> & {
          product: NonNullable<NonNullable<typeof listing.batch>["product"]>;
          warehouse: NonNullable<
            NonNullable<typeof listing.batch>["warehouse"]
          >;
        };
      } =>
        listing.batch !== null &&
        listing.batch.product !== null &&
        listing.batch.warehouse !== null,
    )
    .map((listing) => ({
      id: listing.id,
      batchId: listing.batch.id,
      batchCode: listing.batch.code,
      productName: listing.batch.product.name,
      category: listing.batch.product.category,
      unit: listing.batch.product.unit,
      imageUrl: listing.batch.product.imageUrl,
      warehouseName: listing.batch.warehouse.name,
      warehouseCity: listing.batch.warehouse.city,
      pricePerKg: listing.pricePerKg,
      availableKg: Math.max(
        0,
        Math.min(
          listing.availableKg,
          listing.batch.quantityKg - listing.batch.reservedKg,
        ),
      ),
      tag: listing.suitableFor,
      description: listing.description,
      freshnessScore: listing.batch.freshnessScore,
    }))
    .filter((listing) => listing.availableKg > 0);
}

export async function getResidueListings(
  client: QueryClient = db,
): Promise<SimpleListing[]> {
  const listings = await client.orm.public.ResidueListing
    .where({ isActive: true })
    .include("batch", (batch) =>
      batch
        .include("product", (product) =>
          product.select("id", "name", "category", "unit", "imageUrl"),
        )
        .include("warehouse", (warehouse) =>
          warehouse.select("id", "name", "city"),
        ),
    )
    .orderBy((listing) => listing.createdAt.desc())
    .all();

  return listings
    .filter(
      (listing): listing is typeof listing & {
        batch: NonNullable<typeof listing.batch> & {
          product: NonNullable<NonNullable<typeof listing.batch>["product"]>;
          warehouse: NonNullable<
            NonNullable<typeof listing.batch>["warehouse"]
          >;
        };
      } =>
        listing.batch !== null &&
        listing.batch.product !== null &&
        listing.batch.warehouse !== null,
    )
    .map((listing) => ({
      id: listing.id,
      batchId: listing.batch.id,
      batchCode: listing.batch.code,
      productName: listing.batch.product.name,
      category: listing.batch.product.category,
      unit: listing.batch.product.unit,
      imageUrl: listing.batch.product.imageUrl,
      warehouseName: listing.batch.warehouse.name,
      warehouseCity: listing.batch.warehouse.city,
      pricePerKg: listing.pricePerKg,
      availableKg: Math.max(
        0,
        Math.min(
          listing.availableKg,
          listing.batch.quantityKg - listing.batch.reservedKg,
        ),
      ),
      tag: listing.processingType,
      description: listing.description,
      freshnessScore: listing.batch.freshnessScore,
    }))
    .filter((listing) => listing.availableKg > 0);
}

export async function getBuyerQuotaStatus(
  userId: number,
  client: QueryClient = db,
): Promise<QuotaStatus> {
  return getQuotaStatus(client, userId);
}

export interface OrderSummaryView {
  id: number;
  code: string;
  kind: string;
  status: string;
  paymentProvider: string | null;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  paidAt: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryMethod: string | null;
  estimatedDeliveryAt: string | null;
  scheduledFor: string | null;
  items: Array<{
    id: number;
    productName: string;
    batchCode: string;
    quantityKg: number;
    pricePerKg: number;
    lineTotal: number;
    stage: string;
  }>;
  impact: {
    rescuedKg: number;
    co2eSavedKg: number;
    waterSavedLiters: number;
  };
}

export async function getOrdersForUser(
  userId: number,
  client: QueryClient = db,
): Promise<OrderSummaryView[]> {
  const orders = await client.orm.public.Order
    .where({ buyerId: userId })
    .include("items", (items) =>
      items.include("batch", (batch) =>
        batch.include("product", (product) =>
          product.select("id", "name"),
        ),
      ),
    )
    .include("impactLogs")
    .orderBy((order) => order.createdAt.desc())
    .all();

  return orders.map((order) => {
    const impact = order.impactLogs.reduce(
      (acc, log) => ({
        rescuedKg: acc.rescuedKg + log.rescuedKg,
        co2eSavedKg: acc.co2eSavedKg + log.co2eSavedKg,
        waterSavedLiters: acc.waterSavedLiters + log.waterSavedLiters,
      }),
      { rescuedKg: 0, co2eSavedKg: 0, waterSavedLiters: 0 },
    );

    return {
      id: order.id,
      code: order.code,
      kind: order.kind,
      status: order.status,
      paymentProvider: order.paymentProvider,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shippingCost,
      total: order.total,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      deliveryAddress: order.deliveryAddress,
      deliveryCity: order.deliveryCity,
      deliveryMethod: order.deliveryMethod,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      scheduledFor: order.scheduledFor,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.batch?.product?.name ?? "Produk",
        batchCode: item.batch?.code ?? "-",
        quantityKg: item.quantityKg,
        pricePerKg: item.pricePerKg,
        lineTotal: item.lineTotal,
        stage: item.stage,
      })),
      impact: {
        rescuedKg: Math.round(impact.rescuedKg * 10) / 10,
        co2eSavedKg: Math.round(impact.co2eSavedKg * 10) / 10,
        waterSavedLiters: Math.round(impact.waterSavedLiters),
      },
    };
  });
}

export async function getOrderByCode(
  code: string,
  client: QueryClient = db,
) {
  return client.orm.public.Order
    .where({ code })
    .include("buyer", (buyer) => buyer.select("id", "name", "email"))
    .include("items", (items) =>
      items.include("batch", (batch) =>
        batch.include("product", (product) =>
          product.select("id", "name", "unit"),
        ),
      ),
    )
    .include("impactLogs")
    .first();
}

export async function getImpactSummaryFor(
  client: QueryClient = db,
  userId?: number,
): Promise<ImpactSummary> {
  return getImpactSummary(client, userId);
}

export interface ProductBreakdownView {
  product: {
    id: number;
    name: string;
    category: string;
    unit: string;
    description: string | null;
    basePricePerKg: number;
  };
  producer: { farmName: string; address: string | null } | null;
  warehouse: { name: string; city: string | null } | null;
  breakdown: {
    basePricePerKg: number;
    warehouseCostPerKg: number;
    logisticsCostPerKg: number;
    marginPerKg: number;
    grossPricePerKg: number;
  };
  batch: {
    code: string;
    freshnessScore: number;
    status: string;
    availableKg: number;
  } | null;
}

export async function getProductBreakdown(
  productId: number,
  client: QueryClient = db,
): Promise<ProductBreakdownView | null> {
  const product = await client.orm.public.Product
    .where({ id: productId })
    .include("producer", (producer) =>
      producer.select("id", "farmName", "address"),
    )
    .first();

  if (!product) return null;

  const latestBatch = await client.orm.public.Batch
    .where({ productId })
    .include("priceBreakdown")
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city"),
    )
    .orderBy((batch) => batch.createdAt.desc())
    .first();

  const basePricePerKg = product.basePricePerKg;
  const warehouseCostPerKg = latestBatch?.priceBreakdown?.warehouseCostPerKg ?? 1000;
  const logisticsCostPerKg = latestBatch?.priceBreakdown?.logisticsCostPerKg ?? 1500;
  const marginPerKg = latestBatch?.priceBreakdown?.marginPerKg ?? 2000;

  return {
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      description: product.description,
      basePricePerKg,
    },
    producer: product.producer
      ? {
          farmName: product.producer.farmName,
          address: product.producer.address,
        }
      : null,
    warehouse: latestBatch?.warehouse
      ? {
          name: latestBatch.warehouse.name,
          city: latestBatch.warehouse.city,
        }
      : null,
    breakdown: {
      basePricePerKg,
      warehouseCostPerKg,
      logisticsCostPerKg,
      marginPerKg,
      grossPricePerKg:
        basePricePerKg + warehouseCostPerKg + logisticsCostPerKg + marginPerKg,
    },
    batch: latestBatch
      ? {
          code: latestBatch.code,
          freshnessScore: latestBatch.freshnessScore,
          status: latestBatch.status,
          availableKg: Math.max(
            0,
            latestBatch.quantityKg - latestBatch.reservedKg,
          ),
        }
      : null,
  };
}

export interface TraceView {
  batch: {
    id: number;
    code: string;
    freshnessScore: number;
    status: string;
    harvestDate: string;
    receivedAt: string;
    storageTempC: number;
    quantityKg: number;
    qualityNote: string | null;
  };
  product: { name: string; category: string; unit: string };
  producer: { farmName: string; address: string | null } | null;
  warehouse: { name: string; city: string | null; address: string | null };
  price: {
    basePricePerKg: number;
    warehouseCostPerKg: number;
    logisticsCostPerKg: number;
    marginPerKg: number;
    finalPricePerKg: number;
  } | null;
  timeline: Array<{
    stage: string;
    timestamp: string | Date;
    title: string;
    description: string;
    actor: string;
    freshnessScore: number | null;
  }>;
  impact: {
    rescuedKg: number;
    co2eSavedKg: number;
    waterSavedLiters: number;
  };
}

export async function getTraceByBatchCode(
  batchCode: string,
  client: QueryClient = db,
): Promise<TraceView | null> {
  const batch = await client.orm.public.Batch
    .where({ code: batchCode })
    .include("product", (product) =>
      product.select("id", "name", "category", "unit", "producerId"),
    )
    .include("warehouse", (warehouse) =>
      warehouse.select("id", "name", "city", "address"),
    )
    .include("priceBreakdown")
    .include("cascadeEvents", (events) =>
      events.include("actor", (actor) =>
        actor.select("id", "name"),
      ),
    )
    .include("orderItems", (items) =>
      items.include("order", (order) =>
        order.select("id", "code", "createdAt"),
      ),
    )
    .include("impactLogs")
    .first();

  if (!batch || !batch.product || !batch.warehouse) return null;

  const product = batch.product;
  const producer = product.producerId
    ? await client.orm.public.Producer
        .where({ id: batch.product.producerId })
        .select("id", "farmName", "address")
        .first()
    : null;

  const timeline: TraceView["timeline"] = [
    {
      stage: "PRODUKSI",
      timestamp: batch.harvestDate,
      title: "Panen di kebun",
      description: `${product.name} dipanen${
        producer ? ` di ${producer.farmName}` : ""
      }.`,
      actor: producer?.farmName ?? "Produsen",
      freshnessScore: 100,
    },
    {
      stage: "PENERIMAAN",
      timestamp: batch.receivedAt,
      title: `Diterima di ${batch.warehouse.name}`,
      description: `Suhu simpan ${batch.storageTempC}°C dicatat saat penerimaan.`,
      actor: "Petugas gudang",
      freshnessScore: null,
    },
    ...batch.cascadeEvents
      .filter((event) => event.fromStatus !== null)
      .map((event) => ({
        stage: event.toStatus,
        timestamp: event.createdAt,
        title: `Transisi ke tahap ${event.toStatus}`,
        description:
          event.reason ?? `Skor kesegaran ${event.freshnessScore}/100.`,
        actor: event.actor?.name ?? "Sistem cascade",
        freshnessScore: event.freshnessScore,
      })),
    ...batch.orderItems
      .filter((item) => item.order !== null)
      .map((item) => ({
        stage: "PENJUALAN",
        timestamp: item.order!.createdAt,
        title: `Terjual via ${item.order!.code}`,
        description: `${item.quantityKg} ${product.unit} dibeli dari batch ini.`,
        actor: "Pembeli",
        freshnessScore: null,
      })),
  ].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const impact = batch.impactLogs.reduce(
    (acc, log) => ({
      rescuedKg: acc.rescuedKg + log.rescuedKg,
      co2eSavedKg: acc.co2eSavedKg + log.co2eSavedKg,
      waterSavedLiters: acc.waterSavedLiters + log.waterSavedLiters,
    }),
    { rescuedKg: 0, co2eSavedKg: 0, waterSavedLiters: 0 },
  );

  return {
    batch: {
      id: batch.id,
      code: batch.code,
      freshnessScore: batch.freshnessScore,
      status: batch.status,
      harvestDate: batch.harvestDate,
      receivedAt: batch.receivedAt,
      storageTempC: batch.storageTempC,
      quantityKg: batch.quantityKg,
      qualityNote: batch.qualityNote,
    },
    product: {
      name: product.name,
      category: product.category,
      unit: product.unit,
    },
    producer: producer
      ? { farmName: producer.farmName, address: producer.address }
      : null,
    warehouse: {
      name: batch.warehouse.name,
      city: batch.warehouse.city,
      address: batch.warehouse.address,
    },
    price: batch.priceBreakdown
      ? {
          basePricePerKg: batch.priceBreakdown.basePricePerKg,
          warehouseCostPerKg: batch.priceBreakdown.warehouseCostPerKg,
          logisticsCostPerKg: batch.priceBreakdown.logisticsCostPerKg,
          marginPerKg: batch.priceBreakdown.marginPerKg,
          finalPricePerKg: batch.priceBreakdown.finalPricePerKg,
        }
      : null,
    timeline,
    impact: {
      rescuedKg: Math.round(impact.rescuedKg * 10) / 10,
      co2eSavedKg: Math.round(impact.co2eSavedKg * 10) / 10,
      waterSavedLiters: Math.round(impact.waterSavedLiters),
    },
  };
}

/**
 * The trace route accepts either a numeric batch id or a batch code, so a QR
 * printed on a crate can encode whichever the operator finds convenient.
 */
export async function getTraceByBatchIdOrCode(
  idOrCode: string,
  client: QueryClient = db,
): Promise<TraceView | null> {
  const trimmed = idOrCode.trim();
  if (/^\d+$/.test(trimmed)) {
    const batch = await client.orm.public.Batch
      .where({ id: Number(trimmed) })
      .select("id", "code")
      .first();
    if (batch) {
      return getTraceByBatchCode(batch.code, client);
    }
  }
  return getTraceByBatchCode(trimmed, client);
}

export interface TraceableBatchCard {
  code: string;
  productName: string;
  status: string;
  freshnessScore: number;
  warehouseName: string;
  quantityKg: number;
}

export async function getRecentTraceableBatches(
  limit = 6,
  client: QueryClient = db,
): Promise<TraceableBatchCard[]> {
  const batches = await client.orm.public.Batch
    .include("product", (product) => product.select("id", "name"))
    .include("warehouse", (warehouse) => warehouse.select("id", "name"))
    .orderBy((batch) => batch.createdAt.desc())
    .all();

  return batches
    .filter(
      (batch): batch is typeof batch & {
        product: NonNullable<typeof batch.product>;
        warehouse: NonNullable<typeof batch.warehouse>;
      } => batch.product !== null && batch.warehouse !== null,
    )
    .slice(0, limit)
    .map((batch) => ({
      code: batch.code,
      productName: batch.product.name,
      status: batch.status,
      freshnessScore: batch.freshnessScore,
      warehouseName: batch.warehouse.name,
      quantityKg: batch.quantityKg,
    }));
}

export interface ProducerSaleView {
  orderCode: string;
  orderStatus: string;
  createdAt: string;
  paidAt: string | null;
  buyerName: string | null;
  lines: Array<{
    productName: string;
    quantityKg: number;
    pricePerKg: number;
    lineTotal: number;
    stage: string;
  }>;
  producerTotal: number;
}

/** Orders that contain at least one batch of this producer's products. */
export async function getSalesForProducer(
  producerId: number,
  client: QueryClient = db,
): Promise<ProducerSaleView[]> {
  const items = await client.orm.public.OrderItem
    .include("order", (order) =>
      order.include("buyer", (buyer) => buyer.select("id", "name")),
    )
    .include("batch", (batch) =>
      batch
        .include("product", (product) =>
          product.select("id", "name", "producerId", "basePricePerKg"),
        )
        .include("priceBreakdown"),
    )
    .orderBy((item) => item.createdAt.desc())
    .all();

  const byOrder = new Map<number, ProducerSaleView>();

  for (const item of items) {
    if (
      !item.order ||
      !item.batch ||
      !item.batch.product ||
      item.batch.product.producerId !== producerId
    ) {
      continue;
    }

    let view = byOrder.get(item.order.id);
    if (!view) {
      view = {
        orderCode: item.order.code,
        orderStatus: item.order.status,
        createdAt: item.order.createdAt,
        paidAt: item.order.paidAt,
        buyerName: item.order.buyer?.name ?? null,
        lines: [],
        producerTotal: 0,
      };
      byOrder.set(item.order.id, view);
    }

    view.lines.push({
      productName: item.batch.product.name,
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      lineTotal: item.lineTotal,
      stage: item.stage,
    });

    // Mirror the producer wallet split: base price cut by the cascade
    // discount, so this figure never differs from the wallet ledger.
    view.producerTotal += calculateProducerShareForItem({
      basePricePerKg: item.batch.product.basePricePerKg,
      rescueDiscountPct: item.batch.priceBreakdown?.rescueDiscountPct ?? 0,
      quantityKg: item.quantityKg,
    });
  }

  return Array.from(byOrder.values());
}

export async function getAllUsersWithTiers(client: QueryClient = db) {
  const users = await client.orm.public.User
    .select("id", "name", "email", "role", "createdAt")
    .orderBy((user) => user.createdAt.asc())
    .all();

  const tiers = await client.orm.public.BuyerTier.all();

  const tierByUser = new Map(tiers.map((tier) => [tier.userId, tier]));

  return users.map((user) => ({
    ...user,
    tier: tierByUser.get(user.id) ?? null,
  }));
}

export async function getProductsForAdmin(client: QueryClient = db) {
  return client.orm.public.Product
    .include("producer", (producer) => producer.select("id", "farmName"))
    .orderBy((product) => product.name.asc())
    .all();
}
