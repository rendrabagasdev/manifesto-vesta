# 004-freshness-score-algorithm.md — Freshness Score Algorithm

## Status: Accepted
## Date: 2024
## Decision Maker: Tim Vesta

## Context

Setiap batch di Vesta memiliki Freshness Score 0-100 yang menjadi dasar harga, prioritisasi, dan transisi cascade. Rumus harus transparan, kalkulatif, dan bisa di-adjust admin.

## Decision

**Menggunakan rumus matematika berbasis waktu, suhu, dan profil komoditas.**

## Rationale

### 1. Formula yang Terdefinisi

$$F = 100 \times \max\left(0,\ 1 - \frac{t_{\text{simpan}} \cdot k_{\text{suhu}} + t_{\text{kirim}}}{S_{\text{komoditas}}}\right)$$

### 2. Variabel Penjelasan

| Simbol | Keterangan | Sumber Data |
|--------|-----------|-------------|
| $t_{\text{simpan}}$ | Hari sejak batch diterima ke gudang | `batch.receivedAt` vs `now()` |
| $k_{\text{suhu}}$ | Pengali kerusakan berdasarkan selisih suhu | `abs(storageTempC - idealTempC)` |
| $t_{\text{kirim}}$ | Lama pengiriman dalam hari | `diff(receivedAt - harvestDate)` |
| $S_{\text{komoditas}}$ | Shelf life komoditas dalam hari | `products.shelfLifeDays` |

### 3. Komoditas Profiles (Per Komoditas)

Setiap komoditas memiliki profile yang mempengaruhi degradasi:

| Komoditas | baseDegradationRate | tempSensitivity | tempToleranceC | shelfLifeRange |
|-----------|---------------------|-----------------|----------------|----------------|
| VEGETABLE | 1.0 | 0.08 | 2°C | 3-14 hari |
| FRUIT | 0.85 | 0.06 | 3°C | 5-21 hari |
| PROTEIN | 1.3 | 0.12 | 1°C | 2-7 hari |
| STAPLE | 0.3 | 0.02 | 5°C | 30-365 hari |
| HERB | 1.5 | 0.1 | 2°C | 2-10 hari |
| OTHER | 1.0 | 0.08 | 2°C | 7-30 hari |

**Contoh perhitungan:**
- Tomat (VEGETABLE), 4 hari disimpan, suhu 12°C vs ideal 10°C
- `tempDiff = 2`, `tempPenalty = max(0, 2-2) × 0.08 = 0`
- `temperatureFactor = 1 + 0 = 1`
- Jika `shelfLifeDays = 7`, `totalEffectiveDays = 4 × 1 + 0 = 4`
- `loss = 4 / 7 = 0.57`
- `score = max(0, min(100, round((1-0.57) × 100))) = 43` → RESCUE tier

### 4. Status Threshold

| Skor | Status | Aksi |
|------|--------|------|
| 100-70 | 🟢 FRESH | Harga normal, marketplace utama |
| 69-30 | 🟡 RESCUE | Dynamic discount, tier gate |
| 29-10 | 🟠 FEED | Jual ke peternak sebagai pakan |
| 9-1 | 🔴 RESIDUE | Jual ke kompos/biogas/maggot |
| 0 | ⚫ DISPOSED | Catat sebagai waste |

### 5. Mekanika Perbaruan

- **Otomatis per jam:** Scheduler rekalkulasi semua batch
- **Saat suhu diupdate:** Freshness score recalculate
- **Manual override:** Admin bisa flag `isManuallyAdjusted = true` dan update skor manual
- **Fallback:** Jika data suhu missing, gunakan dummy data (MVP)

### 6. Dynamic Pricing Integration

Setelah skor dihitung, `calculateDynamicPricing()` menentukan discount:

```typescript
const statusIndex = ["FRESH", "RESCUE", "FEED", "RESIDUE", "DISPOSED"].indexOf(status);
const discountPct = profile.rescueDiscountCurve[Math.max(0, statusIndex)];
```

**rescueDiscountCurve per komoditas:**
- VEGETABLE: [0, 25, 50, 75, 90, 100]
- FRUIT: [0, 20, 45, 70, 85, 100]
- PROTEIN: [0, 30, 55, 80, 95, 100]
- STAPLE: [0, 10, 25, 50, 75, 100]
- HERB: [0, 35, 60, 85, 95, 100]
- OTHER: [0, 25, 50, 75, 90, 100]

**Contoh:** RESCUE vegetable dengan index 1 → discount 25%

### 7. Admin Override Feature

> **Catatan:** Admin dapat mengoreksi manual hasil kalkulasi jika inspeksi fisik berbeda.
> - Tandai `isManuallyAdjusted = true` di batch
> - Update `freshnessScore` manual
> - Catat di `cascade_events.reason: "Manual adjustment by admin"`
> - Sistem tetap menghitung discount berdasarkan skor yang sudah di-adjust

## Consequences

### ✅ Positive
- Transparan: rumus fully matematis, tidak "magic number"
- Adaptif: per komoditas berbeda sesuai degradasi nyata
- Admin control: bisa manual override jika perlu
- Demo-friendly: formula mudah dijelaskan ke judge
- Integrasi: langsung ke dynamic pricing dan cascade transisi

### ⚠️ Negative
- Perlu data suhu yang akurat (MVP pakai dummy data)
- Komoditas profile butuh maintenance jika ada komoditas baru
- Perhitungan hari bisa error jika timezone tidak konsisten

## Related ADRs

- [001-prisma-orm.md] — Freshness score disimpan di `batches.freshnessScore`
- [002-nextauth-rbac.md] — Admin yang bisa manual override skor
- [003-cascade-state-machine.md] — Freshness score trigger utama transisi cascade
- [005-loyalty-tier-anti-abuse.md] — Harga berdasarkan skor mempengaruhi keputusan pembeli
- [02-Fitur/🧪 Freshness Score.md] — Sumber referensi asli dari vault

---