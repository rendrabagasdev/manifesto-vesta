# 003-cascade-state-machine.md — State Machine Implementation

## Status: Accepted
## Date: 2024
## Decision Maker: Tim Vesta

## Context

Vesta menggunakan state machine 5 tahap untuk setiap batch produk. Tahap ini menentukan di mana batch bisa dijual dan ke marketplace mana.

## Decision

**Mengimplementasikan Cascade State Machine dengan Prisma Relations dan API Route handlers.**

## Rationale

### 1. State Diagram yang Terstruktur

```
FRESH (skor ≥70) → RESCUE (skor <70) → FEED (skor <30) → RESIDUE (skor <10) → DISPOSED (skor 0)
```

Setiap tahap memiliki:
- **Marketplace sendiri** (utama, rescue, pakan, residue)
- **Pembeli berbeda** (B2C, B2B sesuai tier)
- **Harga berbeda** (normal, diskon, sangat murah)

### 2. Implementasi dengan Prisma

Schema mendefinisikan relations antar model:

```prisma
model Batch {
  id                Int           @id @default(autoincrement())
  freshnessScore    Float         @default(100)
  status            BatchStatus   @default(FRESH)
  cascadeEvents     CascadeEvent[]
  rescueDeal        RescueDeal?
  feedListing       FeedListing?
  residueListing    ResidueListing?
  orderItems        OrderItem[]
  impactLogs        ImpactLog[]
}
```

**Transisi kerja:**
1. `calculateFreshnessScore()` → hasil status baru
2. Perbandingan `previousStatus !== newStatus`
3. Jika berbeda: `CascadeEvent.create()` dengan `fromStatus`, `toStatus`, `freshnessScore`
4. `Batch.update()` dengan `status: newStatus`
5. Switch case per status baru:
   - `RESCUE` → buat `RescueDeal`
   - `FEED` → buat `FeedListing`, nonaktifkan `RescueDeal`
   - `RESIDUE` → buat `ResidueListing`, nonaktifkan `FeedListing`
   - `DISPOSED` → nonaktifkan semua listing, catat di `ImpactLog`

### 3. Simulate-Time Integration

Endpoint `POST /api/demo/simulate-tick` adalah implementasi utama:

- Maju waktu `hours` jumlah
- Recalculate freshness score untuk **semua batch**
- Jika status berubah, otomatis:
  - Buat/update `RescueDeal`
  - Buat/update `FeedListing`
  - Buat/update `ResidueListing`
  - Buat `CascadeEvent` audit log
  - Update `PriceBreakdown` dengan discount dinamis

### 4. Timer & Configuration

- **Timer per tahap** bisa dikonfigurasi admin via dashboard
- **Default transition:** berdasarkan freshness score threshold
  - ≥70 → FRESH
  - 30-69 → RESCUE
  - 10-29 → FEED
  - 1-9 → RESIDUE
  - 0 → DISPOSED
- **Manual override:** Admin bisa update status manual jika inspeksi fisik berbeda

### 5. Audit & Compliance

Setiap transisi dicatat di `cascade_events`:
- `fromStatus` → `toStatus`
- `freshnessScore` saat transisi
- `actorId` (siapa yang melakukan transisi, misal: WAREHOUSE)
- `reason` (alasan transisi, misal: "Skor turun di bawah ambang 70")
- `createdAt` timestamp

**Query untuk audit:**
```sql
SELECT * FROM cascade_events 
WHERE batchId = 1 
ORDER BY createdAt DESC;
```

### 6. Waste Diversion Rate (WDR)

Metrik keberhasilan sistem:

$$WDR = \frac{\text{Batch yang TIDAK berakhir DISPOSED}}{\text{Total batch}} \times 100\%$$

Semakin banyak batch yang ter-transisi ke RESCUE/FEED/RESIDUE (bukan langsung DISPOSED), semakin tinggi WDR.

## Consequences

### ✅ Positive
- Terstruktur: setiap batch punya jalur keluar yang jelas
- Auditable: setiap transisi tercatat otomatis
- Demo-friendly: simulate-time mempercepat testing
- Bisnis logic terpisah per tahap (rescue pricing vs feed pricing vs residue pricing)

### ⚠️ Negative
- Complexity bertambah saat menambah tahap baru
- Perlu testing comprehensive untuk semua transisi
- Jika schema berubah, perlu update migration dan client types

## Related ADRs

- [001-prisma-orm.md] — Prisma relations mendukung state machine implementasi
- [002-nextauth-rbac.md] — Setiap transisi butuh `actorId` (role user)
- [004-freshness-score-algorithm.md] — Freshness score adalah trigger utama transisi
- [005-loyalty-tier-anti-abuse.md] — Anti-abuse rules bekerja dengan cascade timing
- [005-loyalty-tier-anti-abuse.md] — Anti-abuse rules bekerja dengan cascade timing

---