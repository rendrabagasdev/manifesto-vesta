import bcrypt from "bcryptjs";
import { db } from "@/src/prisma/db";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
} from "@/src/lib/auth/demo-accounts";
import type { UserRole } from "@/src/lib/auth/roles";
import type { BatchStatusValue } from "@/src/lib/batches/freshness";
import {
  calculateFreshnessScore as calculateSimpleFreshness,
  statusFromScore,
} from "@/src/lib/batches/freshness";
import {
  calculateDynamicPricing,
  calculateFreshnessScore as calculateEngineFreshness,
} from "@/src/lib/batches/engine";

export const TEST_PASSWORD = DEMO_PASSWORD;
const BCRYPT_ROUNDS = 4;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, from = new Date()): string {
  return new Date(from.getTime() - days * DAY_MS).toISOString().slice(0, 10);
}

export function daysAgoIso(days: number, from = new Date()): string {
  return new Date(from.getTime() - days * DAY_MS).toISOString();
}

export function hoursAgoIso(hours: number, from = new Date()): string {
  return new Date(from.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export function hoursFromNowIso(hours: number, from = new Date()): string {
  return new Date(from.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(
    input.password ?? TEST_PASSWORD,
    BCRYPT_ROUNDS,
  );

  return db.orm.public.User.create({
    email: input.email,
    name: input.name,
    role: input.role,
    passwordHash,
  });
}

export interface TestWorld {
  users: {
    admin: Awaited<ReturnType<typeof createUser>>;
    producer: Awaited<ReturnType<typeof createUser>>;
    warehouse: Awaited<ReturnType<typeof createUser>>;
    consumer: Awaited<ReturnType<typeof createUser>>;
    business: Awaited<ReturnType<typeof createUser>>;
    otherProducer: Awaited<ReturnType<typeof createUser>>;
    otherWarehouse: Awaited<ReturnType<typeof createUser>>;
  };
  producer: Awaited<ReturnType<typeof db.orm.public.Producer.create>>;
  otherProducer: Awaited<ReturnType<typeof db.orm.public.Producer.create>>;
  warehouse: Awaited<ReturnType<typeof db.orm.public.Warehouse.create>>;
  otherWarehouse: Awaited<ReturnType<typeof db.orm.public.Warehouse.create>>;
  products: {
    tomato: Awaited<ReturnType<typeof createProduct>>;
    spinach: Awaited<ReturnType<typeof createProduct>>;
    apple: Awaited<ReturnType<typeof createProduct>>;
    rice: Awaited<ReturnType<typeof createProduct>>;
    chicken: Awaited<ReturnType<typeof createProduct>>;
    herb: Awaited<ReturnType<typeof createProduct>>;
    otherTomato: Awaited<ReturnType<typeof createProduct>>;
  };
}

interface CreateProductInput {
  producerId: number;
  name: string;
  category: "VEGETABLE" | "FRUIT" | "PROTEIN" | "STAPLE" | "HERB" | "OTHER";
  shelfLifeDays: number;
  idealTempC: number;
  basePricePerKg: number;
  unit?: string;
  description?: string | null;
}

export async function createProduct(input: CreateProductInput) {
  return db.orm.public.Product.create({
    producerId: input.producerId,
    name: input.name,
    category: input.category,
    unit: input.unit ?? "kg",
    shelfLifeDays: input.shelfLifeDays,
    idealTempC: input.idealTempC,
    basePricePerKg: input.basePricePerKg,
    description: input.description ?? null,
  });
}

/**
 * Seeds the five demo accounts plus a second producer/warehouse so RBAC tests
 * can prove ownership boundaries.
 */
export async function createWorld(): Promise<TestWorld> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
  const makeUser = (email: string, name: string, role: UserRole) =>
    db.orm.public.User.create({ email, name, role, passwordHash });

  const [admin, producer, warehouse, consumer, business, otherProducer, otherWarehouse] =
    await Promise.all([
      makeUser(DEMO_ACCOUNTS[0].email, DEMO_ACCOUNTS[0].name, "ADMIN"),
      makeUser(DEMO_ACCOUNTS[1].email, DEMO_ACCOUNTS[1].name, "PRODUCER"),
      makeUser(DEMO_ACCOUNTS[2].email, DEMO_ACCOUNTS[2].name, "WAREHOUSE"),
      makeUser(DEMO_ACCOUNTS[3].email, DEMO_ACCOUNTS[3].name, "CONSUMER"),
      makeUser(DEMO_ACCOUNTS[4].email, DEMO_ACCOUNTS[4].name, "BUSINESS"),
      makeUser("produsen2@vesta.id", "Produsen Lain", "PRODUCER"),
      makeUser("gudang2@vesta.id", "Gudang Lain", "WAREHOUSE"),
    ]);

  const producerRow = await db.orm.public.Producer.create({
    userId: producer.id,
    farmName: "Kebun Segar Lembang",
    address: "Jl. Raya Lembang No. 88",
    phone: "0812-3456-7890",
  });

  const otherProducerRow = await db.orm.public.Producer.create({
    userId: otherProducer.id,
    farmName: "Kebun Lain",
    address: "Jl. Lain No. 1",
    phone: "0812-0000-0000",
  });

  const warehouseRow = await db.orm.public.Warehouse.create({
    name: "Gudang Utama Bandung",
    address: "Jl. Soekarno-Hatta No. 120",
    city: "Bandung",
    capacityKg: 5000,
    managerId: warehouse.id,
    latitude: -6.943,
    longitude: 107.625,
  });

  const otherWarehouseRow = await db.orm.public.Warehouse.create({
    name: "Gudang Cadangan",
    address: "Jl. Cadangan No. 2",
    city: "Cimahi",
    capacityKg: 1000,
    managerId: otherWarehouse.id,
    latitude: -6.8722,
    longitude: 107.5425,
  });

  const [tomato, spinach, apple, rice, chicken, herb, otherTomato] =
    await Promise.all([
      createProduct({
        producerId: producerRow.id,
        name: "Tomat Servo",
        category: "VEGETABLE",
        shelfLifeDays: 7,
        idealTempC: 10,
        basePricePerKg: 15000,
        description: "Tomat segar panen Lembang.",
      }),
      createProduct({
        producerId: producerRow.id,
        name: "Bayam Hijau",
        category: "VEGETABLE",
        shelfLifeDays: 4,
        idealTempC: 8,
        basePricePerKg: 12000,
      }),
      createProduct({
        producerId: producerRow.id,
        name: "Apel Malang",
        category: "FRUIT",
        shelfLifeDays: 21,
        idealTempC: 4,
        basePricePerKg: 25000,
      }),
      createProduct({
        producerId: producerRow.id,
        name: "Beras Pandan Wangi",
        category: "STAPLE",
        shelfLifeDays: 180,
        idealTempC: 20,
        basePricePerKg: 14000,
      }),
      createProduct({
        producerId: producerRow.id,
        name: "Ayam Kampung",
        category: "PROTEIN",
        shelfLifeDays: 5,
        idealTempC: 4,
        basePricePerKg: 45000,
      }),
      createProduct({
        producerId: producerRow.id,
        name: "Kemangi",
        category: "HERB",
        shelfLifeDays: 3,
        idealTempC: 6,
        basePricePerKg: 8000,
      }),
      createProduct({
        producerId: otherProducerRow.id,
        name: "Tomat Petani Lain",
        category: "VEGETABLE",
        shelfLifeDays: 7,
        idealTempC: 10,
        basePricePerKg: 15000,
      }),
    ]);

  return {
    users: {
      admin,
      producer,
      warehouse,
      consumer,
      business,
      otherProducer,
      otherWarehouse,
    },
    producer: producerRow,
    otherProducer: otherProducerRow,
    warehouse: warehouseRow,
    otherWarehouse: otherWarehouseRow,
    products: {
      tomato,
      spinach,
      apple,
      rice,
      chicken,
      herb,
      otherTomato,
    },
  };
}

export interface CreateBatchInput {
  product: {
    id: number;
    category: string;
    shelfLifeDays: number;
    idealTempC: number;
    basePricePerKg: number;
    name?: string;
  };
  warehouseId: number;
  code?: string;
  harvestDate?: string;
  receivedAt?: string;
  storageTempC?: number;
  quantityKg?: number;
  reservedKg?: number;
  status?: BatchStatusValue;
  freshnessScore?: number;
  isManuallyAdjusted?: boolean;
  qualityNote?: string | null;
  cascadeFrom?: BatchStatusValue | null;
  cascadeCreatedAt?: string;
  actorId?: number | null;
  costs?: {
    warehouseCostPerKg: number;
    logisticsCostPerKg: number;
    marginPerKg: number;
  };
}

let batchCounter = 0;

export async function createBatch(input: CreateBatchInput) {
  const now = new Date();
  const harvestDate = input.harvestDate ?? today();
  const receivedAt = input.receivedAt ?? now.toISOString();
  const storageTempC = input.storageTempC ?? input.product.idealTempC;
  const quantityKg = input.quantityKg ?? 100;
  const reservedKg = input.reservedKg ?? 0;

  const freshness = calculateEngineFreshness({
    harvestDate,
    receivedAt,
    storageTempC,
    idealTempC: input.product.idealTempC,
    shelfLifeDays: input.product.shelfLifeDays,
    category: input.product.category,
    now,
  });

  const status = input.status ?? statusFromScore(freshness.score);
  const freshnessScore = input.freshnessScore ?? freshness.score;

  const costs = input.costs ?? {
    warehouseCostPerKg: 1000,
    logisticsCostPerKg: 1500,
    marginPerKg: 2000,
  };

  const pricing = calculateDynamicPricing({
    basePricePerKg: input.product.basePricePerKg,
    status,
    category: input.product.category,
    freshnessScore,
    ...costs,
  });

  batchCounter += 1;
  const batch = await db.orm.public.Batch.create({
    code: input.code ?? `TEST-BATCH-${String(batchCounter).padStart(4, "0")}`,
    productId: input.product.id,
    warehouseId: input.warehouseId,
    harvestDate,
    receivedAt,
    storageTempC,
    quantityKg,
    reservedKg,
    freshnessScore,
    status,
    qualityNote: input.qualityNote ?? null,
    isManuallyAdjusted: input.isManuallyAdjusted ?? false,
  });

  const priceBreakdown = await db.orm.public.PriceBreakdown.create({
    batchId: batch.id,
    basePricePerKg: pricing.basePricePerKg,
    warehouseCostPerKg: pricing.warehouseCostPerKg,
    logisticsCostPerKg: pricing.logisticsCostPerKg,
    marginPerKg: pricing.marginPerKg,
    rescueDiscountPct: pricing.rescueDiscountPct,
    finalPricePerKg: pricing.finalPricePerKg,
  });

  await db.orm.public.CascadeEvent.create({
    batchId: batch.id,
    actorId: input.actorId ?? null,
    fromStatus: input.cascadeFrom ?? null,
    toStatus: status,
    freshnessScore,
    reason: "Fixture batch",
    createdAt: input.cascadeCreatedAt ?? now.toISOString(),
  });

  return { batch, priceBreakdown, pricing };
}

/** Recomputes the same values the production simple engine would produce. */
export function simpleFreshness(input: {
  harvestDate: string;
  receivedAt: string;
  storageTempC: number;
  idealTempC: number;
  shelfLifeDays: number;
  now?: Date;
}): number {
  return calculateSimpleFreshness(input);
}

export async function createRescueDeal(input: {
  batchId: number;
  rescuePricePerKg: number;
  discountPct?: number;
  startsAt?: string;
  endsAt?: string;
  earlyAccessHours?: number;
  isActive?: boolean;
}) {
  return db.orm.public.RescueDeal.create({
    batchId: input.batchId,
    discountPct: input.discountPct ?? 30,
    rescuePricePerKg: input.rescuePricePerKg,
    startsAt: input.startsAt ?? hoursAgoIso(1),
    endsAt: input.endsAt ?? hoursFromNowIso(47),
    earlyAccessHours: input.earlyAccessHours ?? 12,
    isActive: input.isActive ?? true,
  });
}

export async function createFeedListing(input: {
  batchId: number;
  pricePerKg: number;
  availableKg?: number;
  isActive?: boolean;
}) {
  return db.orm.public.FeedListing.create({
    batchId: input.batchId,
    pricePerKg: input.pricePerKg,
    availableKg: input.availableKg ?? 100,
    suitableFor: "Ruminansia",
    description: "Pakan ternak",
    isActive: input.isActive ?? true,
  });
}

export async function createResidueListing(input: {
  batchId: number;
  pricePerKg: number;
  availableKg?: number;
  isActive?: boolean;
}) {
  return db.orm.public.ResidueListing.create({
    batchId: input.batchId,
    pricePerKg: input.pricePerKg,
    availableKg: input.availableKg ?? 100,
    processingType: "Kompos",
    description: "Residu organik",
    isActive: input.isActive ?? true,
  });
}

export async function createBuyerTier(input: {
  userId: number;
  tier?: "STARTER" | "SILVER" | "GOLD" | "PLATINUM";
  totalSpend30d?: number;
  points?: number;
  rescueQuotaPerWeek?: number;
  earlyAccessHours?: number;
}) {
  const tier = input.tier ?? "STARTER";
  const defaults: Record<
    "STARTER" | "SILVER" | "GOLD" | "PLATINUM",
    { quota: number; early: number }
  > = {
    STARTER: { quota: 2, early: 0 },
    SILVER: { quota: 5, early: 2 },
    GOLD: { quota: 12, early: 6 },
    PLATINUM: { quota: 25, early: 12 },
  };

  return db.orm.public.BuyerTier.create({
    userId: input.userId,
    tier,
    totalSpend30d: input.totalSpend30d ?? 0,
    points: input.points ?? 0,
    rescueQuotaPerWeek: input.rescueQuotaPerWeek ?? defaults[tier].quota,
    earlyAccessHours: input.earlyAccessHours ?? defaults[tier].early,
  });
}

export async function createLoyaltyEntry(input: {
  userId: number;
  amount: number;
  pointsDelta?: number;
  createdAt?: string;
  orderId?: number | null;
  type?: "EARN" | "REDEEM" | "ADJUST";
  description?: string;
}) {
  return db.orm.public.LoyaltyLedger.create({
    userId: input.userId,
    orderId: input.orderId ?? null,
    type: input.type ?? "EARN",
    amount: input.amount,
    pointsDelta: input.pointsDelta ?? Math.floor(input.amount / 1000),
    description: input.description ?? "Fixture ledger",
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
