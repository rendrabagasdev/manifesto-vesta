# 🗄 Database Documentation - Vesta

> ERD Diagram, tabel descriptions, enum values, indexes, dan migration commands.

---

## 📊 ERD Diagram

```mermaid
erDiagram
    User ||--o{ Producer : "has profile"
    User ||--o{ Warehouse : "manages"
    User ||--o{ BuyerTier : "has tier"
    User ||--o{ Order : "places"
    User ||--o{ LoyaltyLedger : "earns points"
    User ||--o{ RescueQuotaUsage : "uses quota"
    User ||--o{ CascadeEvent : "triggers"
    
    Producer ||--o{ Product : "supplies"
    Product ||--o{ Batch : "contains"
    Batch ||--o{ PriceBreakdown : "has pricing"
    Batch ||--o{ CascadeEvent : "transitions"
    Batch ||--o{ RescueDeal : "becomes"
    Batch ||--o{ FeedListing : "becomes"
    Batch ||--o{ ResidueListing : "becomes"
    
    BuyerTier ||--o{ LoyaltyLedger : "tracks"
    BuyerTier ||--o{ RescueQuotaUsage : "manages quota"
    
    Order ||--o{ OrderItem : "contains"
    Order ||--o{ ImpactLog : "generates"
    
    CascadeEvent ||--o{ ImpactLog : "generates"
    
    stateDiagram-v2
      [*] --> FRESH: Batch masuk gudang
      FRESH --> RESCUE: Skor < 70
      RESCUE --> FEED: Tidak terjual + Skor < 30
      FEED --> RESIDUE: Tidak terjual sebagai pakan
      RESIDUE --> DISPOSED: Tidak terjual sebagai residue
```

---

## 📋 Tabel Descriptions

### 1. `users` / `accounts` — Credentials & Role

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key, auto-increment |
| `email` | String | Unique, untuk login |
| `username` | String? | Optional |
| `name` | String? | Nama lengkap |
| `passwordHash` | String | Hash bcrypt |
| `role` | UserRole | Enum: ADMIN, PRODUCER, WAREHOUSE, CONSUMER, BUSINESS |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `email` (unique)

---

### 2. `producers` — Profil Produsen

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `userId` | Int | Unique, FK → users |
| `farmName` | String | Nama pertanian/tani |
| `address` | String? | Alamat lengkap |
| `phone` | String? | Nomor telepon |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `userId` (unique)

---

### 3. `warehouses` — Lokasi Gudang

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `name` | String | Nama gudang |
| `address` | String? | Alamat |
| `city` | String? | Kota |
| `capacityKg` | Float | Kapasitas maksimum |
| `managerId` | Int? | FK → users (manager) |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `managerId`

---

### 4. `products` — Katalog Bahan Pokok

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `producerId` | Int | FK → producers |
| `name` | String | Nama komoditas |
| `category` | ProductCategory | Enum: VEGETABLE, FRUIT, PROTEIN, STAPLE, HERB, OTHER |
| `unit` | String | Default: "kg" |
| `shelfLifeDays` | Int | Masa simpan dalam hari |
| `idealTempC` | Float | Suhu ideal dalam °C |
| `basePricePerKg` | Int | Harga dasar per kg |
| `description` | String? | Deskripsi |
| `imageUrl` | String? | URL gambar |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `producerId`, `category`

---

### 5. `batches` — Batch Produk

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `code` | String | Unique (format: DEMO-KOMODITAS-NNN) |
| `productId` | Int | FK → products |
| `warehouseId` | Int | FK → warehouses |
| `harvestDate` | DateString | Tanggal panen |
| `receivedAt` | Timestamptz | Default: now() |
| `storageTempC` | Float | Suhu simpanan aktual |
| `quantityKg` | Float | Total kuantitas |
| `reservedKg` | Float | Default: 0 (terpesan) |
| `freshnessScore` | Float | Default: 100 (0-100) |
| `status` | BatchStatus | Enum: FRESH, RESCUE, FEED, RESIDUE, DISPOSED |
| `qualityNote` | String? | Catatan kualitas |
| `isManuallyAdjusted` | Boolean | Default: false |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `productId`, `warehouseId`, `status`

---

### 6. `price_breakdowns` — Rincian Harga

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `batchId` | Int | Unique, FK → batches |
| `basePricePerKg` | Int | Harga dasar petani |
| `warehouseCostPerKg` | Biaya gudang per kg |
| `logisticsCostPerKg` | Biaya logistik per kg |
| `marginPerKg` | Margin per kg |
| `rescueDiscountPct` | Diskon % untuk rescue (default: 0) |
| `finalPricePerKg` | Harga akhir per kg |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `batchId` (unique)

---

### 7. `cascade_events` — Audit Log Transisi

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `batchId` | Int | FK → batches |
| `fromStatus` | BatchStatus | Status sebelum transisi |
| `toStatus` | BatchStatus | Status setelah transisi |
| `freshnessScore` | Nilai skor saat transisi |
| `reason` | String? | Alasan transisi |
| `actorId` | Int? | FK → users (pelaku) |
| `actor` | User? | Relasi ke users |
| `createdAt` | Timestamptz | Default: now() |

**Index:** `batchId`

---

### 8. `buyer_tiers` — Status Tier Pembeli

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `userId` | Int | Unique, FK → users |
| `tier` | TierName | Enum: STARTER, SILVER, GOLD, PLATINUM |
| `totalSpend30d` | Total belanja harga normal 30 hari terakhir |
| `points` | Poin loyalty |
| `rescueQuotaPerWeek` | Kuota rescue per minggu |
| `earlyAccessHours | Jam early access tambahan |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `tier`

---

### 9. `loyalty_ledger` — Riwayat Belanja & Poin

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `userId` | Int | FK → users |
| `orderId` | Int? | FK → orders |
| `type` | LedgerType | Enum: EARN, REDEEM, ADJUST |
| `amount` | Jumlah transaksi |
| `pointsDelta` | Perubahan poin |
| `description` | String? | Keterangan |
| `createdAt` | Timestamptz | Default: now() |

**Index:** `userId`

---

### 10. `rescue_quota_usage` — Tracking Kuota Rescue

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `userId` | Int | FK → users |
| `weekStart` | Tanggal mulai minggu |
| `used` | Berapa kuota yang terpakai |
| `createdAt` | Timestamptz | Default: now() |

**Unique:** `[userId, weekStart]`

---

### 11. `rescue_deals` — Listing Diskon Dinamis

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `batchId` | Int | Unique, FK → batches |
| `discountPct` | Persentase diskon |
| `rescuePricePerKg` | Harga setelah diskon |
| `startsAt` | Waktu mulai deal |
| `endsAt` | Waktu berakhir deal |
| `earlyAccessHours | Jam early access |
| `isActive` | Boolean | Default: true |
| `createdAt` | Timestamptz | Default: now() |

**Index:** `isActive`

---

### 12. `feed_listings` — Listing Pakan Ternak

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `batchId` | Int | Unique, FK → batches |
| `pricePerKg` | Harga per kg |
| `availableKg | Kuantitas tersedia |
| `suitableFor` | Jenis hewan |
| `description` | Deskripsi |
| `isActive` | Boolean | Default: true |
| `createdAt` | Timestamptz | Default: now() |

**Index:** `isActive`

---

### 13. `residue_listings` — Listing Residue

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `batchId` | Int | Unique, FK → batches |
| `pricePerKg` | Harga per kg |
| `availableKg | Kuantitas tersedia |
| `processingType` | Jenis proses (Kompos, Biogas, Maggot) |
| `description` | Deskripsi |
| `isActive` | Boolean | Default: true |
| `createdAt` | Timestamptz | Default: now() |

**Index:** `isActive`

---

### 14. `orders` — Transaksi Pembelian

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `code` | String | Unique (format: ORD-XXX) |
| `buyerId` | Int | FK → users |
| `status` | OrderStatus | Enum: PENDING, PAID, SHIPPED, COMPLETED, CANCELLED |
| `subtotal` | Subtotal sebelum diskon |
| `discount` | Diskon applied |
| `total` | Total bayar |
| `tierAtPurchase | Tier saat pembelian |
| `deliveryAddress` | Alamat pengiriman |
| `createdAt` | Timestamptz | Default: now() |
| `updatedAt` | temporal.updatedAt | Auto-update |

**Index:** `buyerId`, `status`

---

### 15. `order_items` — Detail Item per Order

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `orderId` | Int | FK → orders |
| `batchId` | Int | FK → batches |
| `quantityKg | Kuantitas kg |
| `pricePerKg | Harga per kg |
| `lineTotal | Total per item |
| `stage | BatchStatus | Tahap cascade |
| `createdAt` | Timestamptz | Default: now() |

**Unique:** `[orderId, batchId]`

**Index:** `batchId`

---

### 16. `impact_logs` — Dampak & Sertifikat ESG

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | Int | Primary Key |
| `batchId` | Int? | FK → batches (opsional) |
| `orderId` | Int? | FK → orders (opsional) |
| `cascadeEventId` | Int? | FK → cascade_events |
| `cascadeEvent` | CascadeEvent? | Relasi |
| `rescuedKg | Berapa kg terselamatkan |
| `co2eSavedKg | CO₂e yang terhindari (kg) |
| `waterSavedLiters | Air yang disematkan (liter) |
| `wasteDivertedKg | Limbah yang di-divert |
| `createdAt` | Timestamptz | Default: now() |

**Index:** `batchId`

---

## 🔢 Enum Values

### `UserRole`
| Nilai | Keterangan |
|-------|------------|
| `ADMIN` | Superuser, akses penuh |
| `PRODUCER` | Produsen, bisa input stok |
| `WAREHOUSE` | Gudang, cek kualitas & update status |
| `CONSUMER` | Konsumen, beli di marketplace |
| `BUSINESS` | Bisnis besar, pre-order & pakan |

### `BatchStatus`
| Nilai | Transisi Dari | Keterangan |
|-------|---------------|------------|
| `FRESH` | — | Harga normal, belum ada diskon |
| `RESCUE` | FRESH | Diskon dinamis, tier gate |
| `FEED` | RESCUE | Jual ke peternak sebagai pakan |
| `RESIDUE` | FEED | Jual ke pupuk/biogas/maggot |
| `DISPOSED` | RESIDUE | Catat sebagai waste |

### `ProductCategory`
| Nilai | Contoh Komoditas |
|-------|------------------|
| `VEGETABLE` | Tomat, Bayam |
| `FRUIT` | Apel, Pisang |
| `PROTEIN` | Ayam, Daging |
| `STAPLE` | Beras, Jagung |
| `HERB` | Kemangi, Daun Pete |
| `OTHER` | Komoditas lain |

### `TierName`
| Nilai | Kuota Rescue | Early Access |
|-------|-------------|-------------|
| `STARTER` | 2/minggu | 0 jam |
| `SILVER` | 5/minggu | +2 jam |
| `GOLD` | 12/minggu | +6 jam |
| `PLATINUM` | 25/minggu | +12 jam |

### `LedgerType`
| Nilai | Keterangan |
|-------|------------|
| `EARN | Poin didapat dari pembelian |
| `REDEEM | Poin digunakan untuk diskun |
| `ADJUST | Penyesuaian poin admin |

### `OrderStatus`
| Nilai | Keterangan |
|-------|------------|
| `PENDING | Menunggu pembayaran |
| `PAID | Sudah dibayar |
| `SHIPPED | Sudah dikirim |
| `COMPLETED | Selesai diterima |
| `CANCELLED | Dibatalkan |

---

## 📐 Indexes & Performance

| Tabel | Index | Tujuan |
|-------|-------|--------|
| `users` | `email` | Login lookup |
| `producers` | `userId` | Profil user lookup |
| `warehouses` | `managerId` | Cek manager |
| `products` | `producerId` | Produk per produsen |
| `products` | `category` | Filter komoditas |
| `batches` | `status` | Filter status cascade |
| `batches` | `productId` | Batch per produk |
| `batches` | `warehouseId` | Batch per gudang |
| `price_breakdowns` | `batchId` | Rincian harga |
| `cascade_events` | `batchId` | Audit trail |
| `buyer_tiers` | `tier` | Filter per tier |
| `buyer_tiers` | `userId` | Tier per user |
| `loyalty_ledger` | `userId` | Riwayat poin |
| `rescue_quota_usage` | `[userId, weekStart]` | Kuota mingguan |
| `rescue_deals` | `isActive` | Deal aktif filter |
| `feed_listings` | `isActive` | Listing aktif |
| `residue_listings` | `isActive` | Listing aktif |
| `orders` | `buyerId` | Order per user |
| `orders` | `status` | Filter order |
| `order_items` | `[orderId, batchId]` | Item order unik |
| `order_items` | `batchId` | Item per batch |
| `impact_logs` | `batchId` | Dampak per batch |

---

## 🚀 Migration Commands

```bash
# 1. Generate migration dari schema changes
npx prisma migrate dev --name "deskripsi_migrasi"

# 2. Auto-generate Prisma Client types
npx prisma generate

# 3. Lihat SQL yang akan dijalankan
npx prisma migrate resolve --rolled-back --rolled-back- MigrationName

# 4. Reset database (development only)
npx prisma migrate reset

# 5. Lihat ERD di Studio
npx prisma studio

# 6. Buat migration baru setelah schema.prisma berubah
npx prisma migrate add "nama_migrasi"

# 7. Apply migration ke production
npx prisma migrate deploy
```

---

## 🌱 Seed Data

Setelah migrasi, jalankan seed untuk data demo:

```bash
# Set environment variables
cp .env.example .env
# Isi DATABASE_URL dan variabel lain

# Jalankan seed
npx tsx src/prisma/seed.ts
```

**Akun Demo:**
| Email | Role | Kata Sandi |
|-------|------|-----------|
| admin@vesta.id | ADMIN | Vesta123! |
| produsen@vesta.id | PRODUCER | Vesta123! |
| gudang@vesta.id | WAREHOUSE | Vesta123! |
| b2c@vesta.id | CONSUMER | Vesta123! |
| b2b@vesta.id | BUSINESS | Vesta123! |

---