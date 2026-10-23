# 🔌 API Documentation - Vesta

> Freshness Cascade Platform untuk Lomba Web Development UNIC
> Semua endpoint menggunakan **TypeScript** dengan **Zod** validasi.

---

## 📋 Overview

| Aspek | Detail |
|-------|--------|
| **Arsitektur** | Next.js 16 App Router — Server Actions & API Routes |
| **Validasi** | Zod schema untuk semua input |
| **Format Respons** | JSON standar: `{ data, error, message }` |
| **Autentikasi** | Supabase Auth / NextAuth.js (RBAC 5 peran) |
| **Rate Limit** | 100 requests/menit per IP (default) |

---

## 🔐 Authentication Requirements

| Endpoint | Auth Required | Role |
|----------|--------------|------|
| `GET /api/tiers/me` | ✅ Ya | Semua |
| `GET /api/deals` | ✅ Ya | Semua |
| `POST /api/demo/simulate-tick` | ✅ Ya | ADMIN only |
| `GET /api/batches` | ✅ Ya | PRODUCER, WAREHOUSE, ADMIN |
| `GET /api/products/{id}/breakdown` | ✅ Ya | Semua |
| `GET /api/impact` | ✅ Ya | Semua |
| `GET /api/cascade` | ✅ Ya | ADMIN, WAREHOUSE |
| `GET /api/residue` | ✅ Ya | Semua |
| `POST /api/residue/{id}/buy` | ✅ Ya | Semua dengan kuota |
| `GET /api/feed` | ✅ Ya | Semua |
| `POST /api/feed/{id}/buy` | ✅ Ya | Semua dengan kuota |

> **Catatan:** Semua endpoint melindungi dengan `requireSession()`. Endpoint tanpa auth akan dikembalikan `401 Unauthorized`.

---

## 📡 Endpoint Reference

### 1. `GET /api/tiers/me`

**Deskripsi:** Mendapatkan tier, poin, dan kuota pengguna saat ini.

**Request:**
```http
GET /api/tiers/me
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tier": "SILVER",
    "totalSpend30d": 750000,
    "points": 120,
    "rescueQuotaPerWeek": 5,
    "earlyAccessHours": 2,
    "quotaUsedThisWeek": 2,
    "quotaRemaining": 3,
    "nextTier": "GOLD",
    "nextTierThreshold": 2000000,
    "progressToNextTier": 38,
    "tierBenefits": {
      "quota": 5,
      "earlyAccess": 2,
      "label": "Silver"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Gagal mengambil info tier"
}
```

---

### 2. `GET /api/deals`

**Deskripsi:** Mendapatkan daftar Rescue Deal aktif dengan filter tier.

**Request:**
```http
GET /api/deals?status=active&tier=SILVER
```

**Query Parameters:**
| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `status` | string | Filter status (default: "active") |
| `tier` | string | Filter tier (STARTER, SILVER, GOLD, PLATINUM) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deals": [...],
    "userTier": "SILVER",
    "userEarlyAccessHours": 2,
    "totalDeals": 5
  }
}
```

---

### 3. `POST /api/demo/simulate-tick`

**Deskripsi:** Majukan waktu simulasi (+24 jam default) untuk demo kejudian.

**Request:**
```http
POST /api/demo/simulate-tick
Content-Type: application/json

{
  "hours": 24
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Simulasi waktu maju 24 jam selesai",
  "data": {
    "advancedHours": 24,
    "processedBatches": 5,
    "statusTransitions": [
      {
        "batchId": 1,
        "batchCode": "DEMO-TOMAT-001",
        "fromStatus": "FRESH",
        "toStatus": "RESCUE",
        "freshnessScore": 65
      }
    ],
    "updatedPricing": 5,
    "newRescueDeals": 1,
    "newFeedListings": 0,
    "newResidueListings": 1,
    "disposedBatches": 0
  }
}
```

**Hanya ADMIN yang dapat mengakses.**

---

### 4. `GET /api/batches`

**Deskripsi:** Mendapatkan daftar batch dengan freshness score.

**Request:**
```http
GET /api/batches?status=RESCUE&limit=10
```

**Query Parameters:**
| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `status` | string | Filter status batch |
| `limit` | number | Batas hasil (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "DEMO-TOMAT-001",
      "productName": "Tomat Servo",
      "freshnessScore": 92,
      "status": "FRESH",
      "quantityKg": 120,
      "warehouseName": "Gudang Utama Bandung"
    }
  ]
}
```

---

### 5. `GET /api/products/{id}/breakdown`

**Deskripsi:** Mendapatkan rincian harga (price breakdown) per batch.

**Request:**
```http
GET /api/products/1/breakdown
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "batchId": 1,
      "code": "DEMO-TOMAT-001",
    "basePricePerKg": 15000,
    "warehouseCostPerKg": 1000,
    "logisticsCostPerKg": 1500,
    "marginPerKg": 2000,
    "rescueDiscountPct": 35,
    "finalPricePerKg": 9750,
    "freshnessScore": 65,
    "status": "RESCUE"
  }
}
```

---

### 6. `GET /api/impact`

**Deskripsi:** Agregat dampak & sertifikat ESG.

**Request:**
```http
GET /api/impact?period=30d
```

**Query Parameters:**
| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `period` | string | Periode (30d, 90d, all) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRescuedKg": 45,
    "totalCo2eSavedKg": 67.5,
    "totalWaterSavedLiters": 12000,
    "totalWasteDivertedKg": 45,
    "certificateUrl": "https://vesta.id/certificate/..."
  }
}
```

---

### 7. `GET /api/cascade`

**Deskripsi:** Riwayat transisi status cascade.

**Request:**
```http
GET /api/cascade?batchId=1&limit=20
```

**Query Parameters:**
| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `batchId` | number | Filter per batch |
| `limit` | number | Batas riwayat (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "batchId": 1,
      "fromStatus": "FRESH",
      "toStatus": "RESCUE",
      "freshnessScore": 68,
      "transitionedAt": "2024-01-15T10:30:00Z",
      "actor": "Gudang Sentral"
    }
  ]
}
```

---

### 8. `GET /api/residue`

**Deskripsi:** Mendapatkan daftar Residue Listing.

**Request:**
```http
GET /api/residue?active=true
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "batchCode": "DEMO-TOMAT-004",
      "productName": "Tomat Servo",
      "pricePerKg": 1000,
      "availableKg": 30,
      "processingType": "Kompos",
      "isActive": true
    }
  ]
}
```

---

### 9. `POST /api/residue/{id}/buy`

**Deskripsi:** Pembelian residue listing.

**Request:**
```http
POST /api/residue/1/buy
Content-Type: application/json

{
  "quantityKg": 10
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-001",
    "batchId": 1,
    "quantityKg": 10,
    "pricePerKg": 1000,
    "total": 10000,
    "status": "PAID"
  }
}
```

---

### 10. `GET /api/feed`

**Deskripsi:** Mendapatkan daftar Feed Listing (pakan ternak).

**Request:**
```http
GET /api/feed?active=true
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "batchCode": "DEMO-APEL-003",
      "productName": "Apel Malang",
      "pricePerKg": 3000,
      "availableKg": 80,
      "suitableFor": "Ruminansia",
      "isActive": true
    }
  ]
}
```

---

### 11. `POST /api/feed/{id}/buy`

**Deskripsi:** Pembelian feed listing.

**Request:**
```http
POST /api/feed/1/buy
Content-Type: application/json

{
  "quantityKg": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-002",
    "batchId": 1,
    "quantityKg": 5,
    "pricePerKg": 3000,
    "total": 15000,
    "status": "PAID"
  }
}
```

---

### 12. `GET /api/batches/{id}/trace`

**Deskripsi:** Data QR traceability per batch.

**Request:**
```http
GET /api/batches/1/trace
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "batchId": 1,
    "code": "DEMO-TOMAT-001",
    "productName": "Tomat Servo",
    "producerName": "Pak Tani",
    "warehouseName": "Gudang Utama Bandung",
    "harvestDate": "2024-01-10",
    "storageTempC": 10,
    "freshnessScore": 92,
    "status": "FRESH",
    "impactLogs": [...]
  }
}
```

---

## ⚠️ Error Codes

| Kode | Nama | Deskripsi |
|------|------|-----------|
| `400` | Bad Request | Input validasi gagal (Zod error) |
| `401` | Unauthorized | Token/missing session |
| `403` | Forbidden | Role tidak memiliki akses |
| `404` | Not Found | Resource tidak ada |
| `429` | Too Many Requests | Melebihi rate limit |
| `500` | Internal Server Error | Kesalahan server |

**Format Error Response:**
```json
{
  "success": false,
  "error": "Pesan kesalahan",
  "message": "Optional detail tambahan"
}
```

---

## 🚦 Rate Limiting

- **Default:** 100 requests/menit per IP
- **Auth endpoints:** 20 requests/menit per user
- **Demo simulate-tick:** 5 requests/jam (hanya ADMIN)
- **Header:** `X-RateLimit-Remaining` dan `X-RateLimit-Reset` di response

**Ketika melebihi limit:**
```json
{
  "success": false,
  "error": "Terlalu banyak permintaan, coba lagi nanti.",
  "retryAfter": 60
}
```

---

## 📦 External API Integrations (Fallback)

| Layanan | Endpoint | Timeout | Fallback |
|---------|----------|---------|----------|
| **BMKG** | Cuaca | 1.5s | `fallback-data.json` |
| **Midtrans** | Pembayaran | 1.5s | Mode sandbox static |
| **Fonnte** | WhatsApp | 1.5s | Kirim manual ke admin |
| **PIHPS** | Harga pasar | 1.5s | Harga manual dari admin |

---