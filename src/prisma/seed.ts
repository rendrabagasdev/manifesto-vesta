import "dotenv/config";
import bcrypt from "bcryptjs";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../lib/auth/demo-accounts";
import { db } from "./db";

const DEMO_ORDER_CODE = "ORD-DEMO-001";

const BATCH_CODES = [
  "DEMO-TOMAT-001",
  "DEMO-BAYAM-002",
  "DEMO-APEL-003",
  "DEMO-TOMAT-004",
  "DEMO-BERAS-005",
  "DEMO-WORTEL-006",
  "DEMO-CABE-007",
  "DEMO-TELUR-008",
  "DEMO-KANGKUNG-009",
] as const;

type BatchStatusValue = "FRESH" | "RESCUE" | "FEED" | "RESIDUE" | "DISPOSED";
type ProductCategoryValue =
  | "VEGETABLE"
  | "FRUIT"
  | "PROTEIN"
  | "STAPLE"
  | "HERB"
  | "OTHER";

type ProductSeed = {
  name: string;
  category: ProductCategoryValue;
  shelfLifeDays: number;
  idealTempC: number;
  basePricePerKg: number;
  description: string;
};

type BatchSeed = {
  code: string;
  productId: number;
  warehouseId: number;
  harvestDate: string;
  storageTempC: number;
  quantityKg: number;
  freshnessScore: number;
  status: BatchStatusValue;
  qualityNote: string;
  fromStatus: BatchStatusValue | null;
  cascadeReason: string;
  price: {
    basePricePerKg: number;
    warehouseCostPerKg: number;
    logisticsCostPerKg: number;
    marginPerKg: number;
    rescueDiscountPct: number;
    finalPricePerKg: number;
  };
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function requireUser(email: string) {
  const user = await db.orm.public.User.where({ email }).first();
  if (!user) throw new Error(`User demo tidak ditemukan: ${email}`);
  return user;
}

async function createBatch(seed: BatchSeed, actorId: number) {
  const batch = await db.orm.public.Batch.create({
    code: seed.code,
    productId: seed.productId,
    warehouseId: seed.warehouseId,
    harvestDate: seed.harvestDate,
    storageTempC: seed.storageTempC,
    quantityKg: seed.quantityKg,
    freshnessScore: seed.freshnessScore,
    status: seed.status,
    qualityNote: seed.qualityNote,
  });

  await db.orm.public.PriceBreakdown.create({
    batchId: batch.id,
    basePricePerKg: seed.price.basePricePerKg,
    warehouseCostPerKg: seed.price.warehouseCostPerKg,
    logisticsCostPerKg: seed.price.logisticsCostPerKg,
    marginPerKg: seed.price.marginPerKg,
    rescueDiscountPct: seed.price.rescueDiscountPct,
    finalPricePerKg: seed.price.finalPricePerKg,
  });

  const event = await db.orm.public.CascadeEvent.create({
    batchId: batch.id,
    actorId,
    fromStatus: seed.fromStatus,
    toStatus: seed.status,
    freshnessScore: seed.freshnessScore,
    reason: seed.cascadeReason,
  });

  return { batch, event };
}

type BuyerTierSeed = {
  tier: "STARTER" | "SILVER" | "GOLD" | "PLATINUM";
  totalSpend30d: number;
  points: number;
  rescueQuotaPerWeek: number;
  earlyAccessHours: number;
};

async function ensureBuyerTier(userId: number, seed: BuyerTierSeed) {
  const existing = await db.orm.public.BuyerTier.where({ userId }).first();
  if (existing) {
    await db.orm.public.BuyerTier.where({ id: existing.id }).update(seed);
    return;
  }
  await db.orm.public.BuyerTier.create({ userId, ...seed });
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const account of DEMO_ACCOUNTS) {
    const existing = await db.orm.public.User.where({
      email: account.email,
    }).first();

    if (existing) {
      await db.orm.public.User.where({ id: existing.id }).update({
        name: account.name,
        role: account.role,
        passwordHash,
      });
    } else {
      await db.orm.public.User.create({
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
      });
    }

    console.log(`siap  ${account.role.padEnd(14)} ${account.email}`);
  }

  const producerUser = await requireUser("produsen@vesta.id");
  const warehouseUser = await requireUser("gudang@vesta.id");
  const b2cUser = await requireUser("b2c@vesta.id");
  const b2bUser = await requireUser("b2b@vesta.id");

  const existingOrder = await db.orm.public.Order.where({
    code: DEMO_ORDER_CODE,
  }).first();

  if (existingOrder) {
    await db.orm.public.LoyaltyLedger.where({
      orderId: existingOrder.id,
    }).deleteAll();
    await db.orm.public.ImpactLog.where({
      orderId: existingOrder.id,
    }).deleteAll();
    await db.orm.public.Order.where({ id: existingOrder.id }).delete();
  }

  for (const code of BATCH_CODES) {
    const existingBatch = await db.orm.public.Batch.where({ code }).first();
    if (!existingBatch) continue;
    await db.orm.public.ImpactLog.where({
      batchId: existingBatch.id,
    }).deleteAll();
    await db.orm.public.Batch.where({ id: existingBatch.id }).delete();
  }

  const existingProducer = await db.orm.public.Producer.where({
    userId: producerUser.id,
  }).first();

  const producer = existingProducer
    ? await db.orm.public.Producer.where({ id: existingProducer.id }).update({
        farmName: "Kebun Segar Lembang",
        address: "Jl. Raya Lembang No. 88, Bandung Barat",
        phone: "0812-3456-7890",
      })
    : await db.orm.public.Producer.create({
        userId: producerUser.id,
        farmName: "Kebun Segar Lembang",
        address: "Jl. Raya Lembang No. 88, Bandung Barat",
        phone: "0812-3456-7890",
      });

  if (!producer) throw new Error("Gagal menyiapkan producer demo.");
  const producerId = producer.id;

  const existingWarehouse = await db.orm.public.Warehouse.where({
    name: "Gudang Utama Bandung",
  }).first();

  const warehouse = existingWarehouse
    ? await db.orm.public.Warehouse.where({
        id: existingWarehouse.id,
      }).update({
        managerId: warehouseUser.id,
        address: "Jl. Soekarno-Hatta No. 120, Bandung",
        city: "Bandung",
        capacityKg: 5000,
      })
    : await db.orm.public.Warehouse.create({
        name: "Gudang Utama Bandung",
        managerId: warehouseUser.id,
        address: "Jl. Soekarno-Hatta No. 120, Bandung",
        city: "Bandung",
        capacityKg: 5000,
      });

  if (!warehouse) throw new Error("Gagal menyiapkan warehouse demo.");

  async function ensureProduct(seed: ProductSeed) {
    const existing = await db.orm.public.Product.where({
      producerId,
      name: seed.name,
    }).first();

    if (existing) {
      return db.orm.public.Product.where({ id: existing.id }).update(seed);
    }

    return db.orm.public.Product.create({
      producerId,
      ...seed,
    });
  }

  const tomato = await ensureProduct({
    name: "Tomat Servo",
    category: "VEGETABLE",
    shelfLifeDays: 7,
    idealTempC: 10,
    basePricePerKg: 15000,
    description: "Tomat segar panen Lembang dengan tingkat kematangan seragam.",
  });

  if (!tomato) throw new Error("Gagal menyiapkan produk tomat demo.");

  const spinach = await ensureProduct({
    name: "Bayam Hijau",
    category: "VEGETABLE",
    shelfLifeDays: 4,
    idealTempC: 8,
    basePricePerKg: 12000,
    description: "Bayam hijau daun lebar, cocok untuk konsumsi harian.",
  });

  if (!spinach) throw new Error("Gagal menyiapkan produk bayam demo.");

  const apple = await ensureProduct({
    name: "Apel Malang",
    category: "FRUIT",
    shelfLifeDays: 21,
    idealTempC: 4,
    basePricePerKg: 25000,
    description: "Apel Malang manis dengan tekstur renyah.",
  });

  if (!apple) throw new Error("Gagal menyiapkan produk apel demo.");

  const rice = await ensureProduct({
    name: "Beras Pandan Wangi",
    category: "STAPLE",
    shelfLifeDays: 180,
    idealTempC: 20,
    basePricePerKg: 14000,
    description: "Beras pandan wangi premium dari petani mitra.",
  });

  if (!rice) throw new Error("Gagal menyiapkan produk beras demo.");

  const carrot = await ensureProduct({
    name: "Wortel Berastagi",
    category: "VEGETABLE",
    shelfLifeDays: 21,
    idealTempC: 4,
    basePricePerKg: 11000,
    description: "Wortel Berastagi manis dengan warna oranye cerah.",
  });

  if (!carrot) throw new Error("Gagal menyiapkan produk wortel demo.");

  const chili = await ensureProduct({
    name: "Cabe Merah Keriting",
    category: "HERB",
    shelfLifeDays: 10,
    idealTempC: 12,
    basePricePerKg: 38000,
    description: "Cabe merah keriting panen petani Brebes.",
  });

  if (!chili) throw new Error("Gagal menyiapkan produk cabe demo.");

  const egg = await ensureProduct({
    name: "Telur Ayam Kampung",
    category: "PROTEIN",
    shelfLifeDays: 14,
    idealTempC: 18,
    basePricePerKg: 32000,
    description: "Telur ayam kampung dari peternakan mitra.",
  });

  if (!egg) throw new Error("Gagal menyiapkan produk telur demo.");

  const waterSpinach = await ensureProduct({
    name: "Kangkung Hidroponik",
    category: "VEGETABLE",
    shelfLifeDays: 5,
    idealTempC: 10,
    basePricePerKg: 8000,
    description: "Kangkung hidroponik segar dipanen pagi hari.",
  });

  if (!waterSpinach) throw new Error("Gagal menyiapkan produk kangkung demo.");

  await createBatch(
    {
      code: "DEMO-TOMAT-001",
      productId: tomato.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(2),
      storageTempC: 9,
      quantityKg: 120,
      freshnessScore: 92,
      status: "FRESH",
      qualityNote: "Warna merata, tidak ada luka.",
      fromStatus: null,
      cascadeReason: "Batch diterima dan lolos inspeksi.",
      price: {
        basePricePerKg: 15000,
        warehouseCostPerKg: 1000,
        logisticsCostPerKg: 1500,
        marginPerKg: 2000,
        rescueDiscountPct: 0,
        finalPricePerKg: 19500,
      },
    },
    warehouseUser.id,
  );

  const { batch: rescueSpinach, event: rescueEvent } = await createBatch(
    {
      code: "DEMO-BAYAM-002",
      productId: spinach.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(4),
      storageTempC: 12,
      quantityKg: 45,
      freshnessScore: 58,
      status: "RESCUE",
      qualityNote: "Daun mulai lemas, masih layak konsumsi.",
      fromStatus: "FRESH",
      cascadeReason: "Skor turun di bawah ambang 70.",
      price: {
        basePricePerKg: 12000,
        warehouseCostPerKg: 1000,
        logisticsCostPerKg: 1500,
        marginPerKg: 1500,
        rescueDiscountPct: 35,
        finalPricePerKg: 7800,
      },
    },
    warehouseUser.id,
  );

  const { batch: feedApple } = await createBatch(
    {
      code: "DEMO-APEL-003",
      productId: apple.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(25),
      storageTempC: 18,
      quantityKg: 80,
      freshnessScore: 24,
      status: "FEED",
      qualityNote: "Tidak layak konsumsi manusia, aman untuk pakan.",
      fromStatus: "RESCUE",
      cascadeReason: "Melewati ambang tahap pakan.",
      price: {
        basePricePerKg: 25000,
        warehouseCostPerKg: 1000,
        logisticsCostPerKg: 1000,
        marginPerKg: 500,
        rescueDiscountPct: 80,
        finalPricePerKg: 4000,
      },
    },
    warehouseUser.id,
  );

  const { batch: residueTomato } = await createBatch(
    {
      code: "DEMO-TOMAT-004",
      productId: tomato.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(30),
      storageTempC: 24,
      quantityKg: 30,
      freshnessScore: 6,
      status: "RESIDUE",
      qualityNote: "Sudah tidak layak konsumsi, dialihkan ke residu organik.",
      fromStatus: "FEED",
      cascadeReason: "Melewati ambang tahap residu.",
      price: {
        basePricePerKg: 15000,
        warehouseCostPerKg: 500,
        logisticsCostPerKg: 500,
        marginPerKg: 200,
        rescueDiscountPct: 95,
        finalPricePerKg: 1000,
      },
    },
    warehouseUser.id,
  );

  const { batch: freshRice } = await createBatch(
    {
      code: "DEMO-BERAS-005",
      productId: rice.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(10),
      storageTempC: 20,
      quantityKg: 200,
      freshnessScore: 96,
      status: "FRESH",
      qualityNote: "Butir utuh, kondisi kering.",
      fromStatus: null,
      cascadeReason: "Batch diterima dan lolos inspeksi.",
      price: {
        basePricePerKg: 14000,
        warehouseCostPerKg: 800,
        logisticsCostPerKg: 1200,
        marginPerKg: 2000,
        rescueDiscountPct: 0,
        finalPricePerKg: 18000,
      },
    },
    warehouseUser.id,
  );

  await createBatch(
    {
      code: "DEMO-WORTEL-006",
      productId: carrot.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(3),
      storageTempC: 5,
      quantityKg: 150,
      freshnessScore: 88,
      status: "FRESH",
      qualityNote: "Warna cerah, tidak ada retak.",
      fromStatus: null,
      cascadeReason: "Batch diterima dan lolos inspeksi.",
      price: {
        basePricePerKg: 11000,
        warehouseCostPerKg: 1000,
        logisticsCostPerKg: 1500,
        marginPerKg: 2000,
        rescueDiscountPct: 0,
        finalPricePerKg: 15500,
      },
    },
    warehouseUser.id,
  );

  await createBatch(
    {
      code: "DEMO-CABE-007",
      productId: chili.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(2),
      storageTempC: 12,
      quantityKg: 60,
      freshnessScore: 84,
      status: "FRESH",
      qualityNote: "Kering, tangkai hijau.",
      fromStatus: null,
      cascadeReason: "Batch diterima dan lolos inspeksi.",
      price: {
        basePricePerKg: 38000,
        warehouseCostPerKg: 1000,
        logisticsCostPerKg: 1500,
        marginPerKg: 2500,
        rescueDiscountPct: 0,
        finalPricePerKg: 43000,
      },
    },
    warehouseUser.id,
  );

  await createBatch(
    {
      code: "DEMO-TELUR-008",
      productId: egg.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(1),
      storageTempC: 18,
      quantityKg: 90,
      freshnessScore: 95,
      status: "FRESH",
      qualityNote: "Kulit bersih, tidak ada retak.",
      fromStatus: null,
      cascadeReason: "Batch diterima dan lolos inspeksi.",
      price: {
        basePricePerKg: 32000,
        warehouseCostPerKg: 800,
        logisticsCostPerKg: 1200,
        marginPerKg: 2000,
        rescueDiscountPct: 0,
        finalPricePerKg: 36000,
      },
    },
    warehouseUser.id,
  );

  await createBatch(
    {
      code: "DEMO-KANGKUNG-009",
      productId: waterSpinach.id,
      warehouseId: warehouse.id,
      harvestDate: daysAgo(1),
      storageTempC: 10,
      quantityKg: 70,
      freshnessScore: 90,
      status: "FRESH",
      qualityNote: "Daun segar, tangkai renyah.",
      fromStatus: null,
      cascadeReason: "Batch diterima dan lolos inspeksi.",
      price: {
        basePricePerKg: 8000,
        warehouseCostPerKg: 1000,
        logisticsCostPerKg: 1500,
        marginPerKg: 1500,
        rescueDiscountPct: 0,
        finalPricePerKg: 12000,
      },
    },
    warehouseUser.id,
  );

  await db.orm.public.RescueDeal.create({
    batchId: rescueSpinach.id,
    discountPct: 35,
    rescuePricePerKg: 7800,
    startsAt: hoursFromNow(-1),
    endsAt: hoursFromNow(35),
    earlyAccessHours: 2,
    isActive: true,
  });

  await db.orm.public.FeedListing.create({
    batchId: feedApple.id,
    pricePerKg: 3000,
    availableKg: 80,
    suitableFor: "Ruminansia",
    description: "Apel layak pakan dengan kadar air terkontrol.",
    isActive: true,
  });

  await db.orm.public.ResidueListing.create({
    batchId: residueTomato.id,
    pricePerKg: 800,
    availableKg: 30,
    processingType: "Kompos",
    description: "Residu tomat untuk bahan kompos organik.",
    isActive: true,
  });

  const order = await db.orm.public.Order.create({
    code: DEMO_ORDER_CODE,
    buyerId: b2cUser.id,
    status: "PAID",
    subtotal: 71000,
    discount: 0,
    total: 71000,
    tierAtPurchase: "SILVER",
    deliveryAddress: "Jl. Cihampelas No. 45, Bandung",
  });

  await db.orm.public.OrderItem.create({
    orderId: order.id,
    batchId: rescueSpinach.id,
    quantityKg: 5,
    pricePerKg: 7800,
    lineTotal: 39000,
    stage: "RESCUE",
  });

  await db.orm.public.OrderItem.create({
    orderId: order.id,
    batchId: freshRice.id,
    quantityKg: 2,
    pricePerKg: 16000,
    lineTotal: 32000,
    stage: "FRESH",
  });

  await db.orm.public.ImpactLog.create({
    batchId: rescueSpinach.id,
    orderId: order.id,
    cascadeEventId: rescueEvent.id,
    rescuedKg: 5,
    co2eSavedKg: 7.5,
    waterSavedLiters: 1200,
    wasteDivertedKg: 5,
  });

  await db.orm.public.LoyaltyLedger.create({
    userId: b2cUser.id,
    orderId: order.id,
    type: "EARN",
    amount: 71000,
    pointsDelta: 71,
    description: "Pembelian demo Rescue Deal dan beras.",
  });

  await ensureBuyerTier(b2cUser.id, {
    tier: "SILVER",
    totalSpend30d: 750000,
    points: 120,
    rescueQuotaPerWeek: 5,
    earlyAccessHours: 2,
  });

  await ensureBuyerTier(b2bUser.id, {
    tier: "GOLD",
    totalSpend30d: 2500000,
    points: 500,
    rescueQuotaPerWeek: 12,
    earlyAccessHours: 6,
  });

  console.log("\nproduk      4");
  console.log("batch       9 (FRESH 6, RESCUE 1, FEED 1, RESIDUE 1)");
  console.log("listing     RescueDeal 1, FeedListing 1, ResidueListing 1");
  console.log("order       1 (PAID, 2 item, impact log, loyalty ledger)");
  console.log("\nData demo siap. Kata sandi akun: " + DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
