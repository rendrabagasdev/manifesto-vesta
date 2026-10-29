# Vesta Marketplace API Documentation

Dokumentasi lengkap API untuk integrasi dengan Vesta Marketplace - Platform cascade freshness untuk komoditas pertanian.

## 🚀 Quick Start

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.vesta-marketplace.com`

### Interactive Documentation
Akses Swagger UI untuk testing langsung:
```
http://localhost:3000/api-docs
```

### OpenAPI Spec
Download OpenAPI 3.1 specification:
```
http://localhost:3000/api/docs/openapi.json
```

## 🔐 Autentikasi

### Session-Based (Web)
Untuk aplikasi web, gunakan NextAuth session cookie yang otomatis dikelola browser.

### Bearer Token (Cron/Scripts)
Untuk cron jobs atau scripts:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://api.vesta.com/api/cron/cascade-tick
```

Set `CRON_SECRET` di environment variables.

## 👥 Role-Based Access Control (RBAC)

| Role | Deskripsi | Akses |
|------|-----------|-------|
| **CONSUMER** | Pembeli retail | Orders, rescue deals, marketplace |
| **BUSINESS** | Pembeli B2B | Bulk orders, preorders, impact reports |
| **PRODUCER** | Petani/produsen | Create batches, view own products |
| **WAREHOUSE** | Manajer gudang | Quality updates, batch management |
| **ADMIN** | Administrator | Full access, config management |

## 📚 Core Concepts

### 1. Cascade Freshness System

Produk otomatis berpindah status berdasarkan **freshness score** (0-100):

```
FRESH (70-100)    →  Harga Normal
  ↓ threshold
RESCUE (40-69)    →  Diskon 35% (time-limited deals)
  ↓ threshold
FEED (20-39)      →  Diskon 80% (pakan ternak)
  ↓ threshold
RESIDUE (0-19)    →  Diskon 95% (kompos/biogas)
  ↓ threshold
DISPOSED          →  Dibuang (tracked untuk metrics)
```

### 2. Freshness Score Calculation

Score dihitung berdasarkan:
- **Harvest age**: Hari sejak panen
- **Storage temperature**: Deviasi dari suhu ideal
- **Shelf life**: Sisa umur simpan produk
- **Category factor**: Multiplier per kategori

```javascript
// Simplified formula
const ageScore = (shelfLifeDays - daysSinceHarvest) / shelfLifeDays * 100;
const tempPenalty = Math.abs(storageTemp - idealTemp) * tempSensitivity;
const freshnessScore = Math.max(0, Math.min(100, ageScore - tempPenalty));
```

### 3. Rescue Deals

**Time-limited discount offers** dengan tier-based access:

| Tier | Weekly Quota | Early Access | Loyalty Points |
|------|--------------|--------------|----------------|
| Bronze | 2 deals | - | 1x |
| Silver | 3 deals | - | 1.2x |
| Gold | 5 deals | 2 jam | 1.5x |
| Platinum | Unlimited | 2 jam | 2x |

**Early Access**: Gold/Platinum dapat claim 2 jam sebelum deal dibuka ke publik.

### 4. Loyalty System

Konsumen mendapatkan poin dari setiap pembelian:
- **Regular**: 1 point per Rp 1.000
- **Rescue deals**: 1.5x multiplier
- **Feed/Residue**: 2x multiplier

Tier upgrade otomatis berdasarkan total poin.

## 🔧 Common Use Cases

### Use Case 1: Create Batch (Producer)

```bash
POST /api/batches
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "productId": 1,
  "warehouseId": 1,
  "harvestDate": "2026-10-20",
  "quantityKg": 500,
  "storageTempC": 5.0,
  "qualityNote": "Grade A, organik"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch berhasil dibuat",
  "data": {
    "id": 123,
    "code": "VST-20261026-A1B2C3",
    "status": "FRESH",
    "freshnessScore": 95
  }
}
```

### Use Case 2: Place Order (Consumer)

```bash
POST /api/orders
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "items": [
    {
      "batchId": 123,
      "quantityKg": 10.0
    }
  ],
  "deliveryAddress": "Jl. Raya No. 123, Jakarta",
  "contactPhone": "081234567890",
  "notes": "Pengiriman pagi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pesanan berhasil dibuat",
  "data": {
    "code": "VST-ORD-20261026-789012",
    "paid": false,
    "paymentUrl": "https://app.sandbox.midtrans.com/snap/v4/..."
  }
}
```

### Use Case 3: Claim Rescue Deal (Consumer)

```bash
POST /api/rescue-deals/45/claim
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "quantityKg": 5.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Penawaran diskon berhasil diklaim (5 kg dari 50 kg tersedia).",
  "data": {
    "code": "VST-ORD-20261026-345678",
    "paid": false,
    "paymentUrl": "https://app.sandbox.midtrans.com/...",
    "quota": {
      "remaining": 4,
      "limit": 5,
      "tier": "GOLD",
      "earlyAccessHours": 2
    }
  }
}
```

### Use Case 4: Update Batch Quality (Warehouse)

```bash
PUT /api/batches/123/quality
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "storageTempC": 7.5,
  "qualityNote": "Suhu naik, perlu monitoring"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Kualitas batch berhasil diperbarui",
  "data": {
    "batchId": 123,
    "code": "VST-20261026-A1B2C3",
    "status": "RESCUE",
    "previousStatus": "FRESH",
    "freshnessScore": 65,
    "previousScore": 85,
    "transitioned": true,
    "rescueDealId": 45,
    "reason": "Freshness score turun di bawah threshold FRESH (70)"
  }
}
```

### Use Case 5: Simulate Time (Demo/Testing)

```bash
POST /api/demo/simulate-tick
Content-Type: application/json
Cookie: next-auth.session-token=...

{
  "hours": 48
}
```

**Response:**
```json
{
  "success": true,
  "message": "Simulasi waktu maju 48 jam selesai",
  "data": {
    "advancedHours": 48,
    "processedBatches": 25,
    "statusTransitions": [
      {
        "batchId": 123,
        "batchCode": "VST-20261026-A1B2C3",
        "fromStatus": "FRESH",
        "toStatus": "RESCUE",
        "freshnessScore": 65
      }
    ],
    "newRescueDeals": 5,
    "newFeedListings": 2,
    "disposedBatches": 0
  }
}
```

### Use Case 6: Get Product Breakdown

```bash
GET /api/products/1/breakdown
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "Tomat Cherry Organik",
      "category": "VEGETABLES",
      "shelfLifeDays": 7,
      "basePricePerKg": 25000
    },
    "priceBreakdown": {
      "basePricePerKg": 25000,
      "warehouseCostPerKg": 1000,
      "logisticsCostPerKg": 1500,
      "marginPerKg": 2000,
      "grossPricePerKg": 29500
    },
    "cascadePricing": [
      {
        "status": "FRESH",
        "label": "Harga Normal (Segar)",
        "discountPct": 0,
        "pricePerKg": 29500
      },
      {
        "status": "RESCUE",
        "label": "Penawaran Diskon",
        "discountPct": 35,
        "pricePerKg": 19175
      },
      {
        "status": "FEED",
        "label": "Pakan Ternak",
        "discountPct": 80,
        "pricePerKg": 5900
      }
    ]
  }
}
```

### Use Case 7: Cron Cascade Tick

```bash
GET /api/cron/cascade-tick
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "message": "Cascade tick berhasil dijalankan",
  "data": {
    "processedBatches": 42,
    "transitions": 8,
    "newRescueDeals": 3,
    "expiredDeals": 1
  }
}
```

## 📋 Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errorCode": "MACHINE_READABLE_CODE",
  "fieldErrors": {
    "quantityKg": ["Jumlah pembelian harus lebih dari 0 kg."]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Deskripsi |
|------|-------------|-----------|
| `VALIDATION_ERROR` | 400 | Input tidak valid |
| `INVALID_BODY` | 400 | JSON body tidak valid |
| `UNAUTHORIZED` | 401 | Autentikasi diperlukan |
| `FORBIDDEN` | 403 | Tidak memiliki akses |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `RESCUE_QUOTA_EXHAUSTED` | 403 | Quota rescue deal habis |
| `EARLY_ACCESS_LOCKED` | 403 | Early access belum tersedia |
| `INSUFFICIENT_STOCK` | 400 | Stock tidak cukup |
| `DEAL_INACTIVE` | 403 | Deal tidak aktif |
| `SIMULATION_DISABLED` | 403 | Simulasi dinonaktifkan |

## 🔄 Webhooks (Coming Soon)

Vesta akan mengirim webhook untuk events penting:

- `batch.status_changed`: Batch berpindah status cascade
- `rescue_deal.created`: Rescue deal baru dibuat
- `rescue_deal.claimed`: Rescue deal diklaim konsumen
- `order.paid`: Order berhasil dibayar
- `order.shipped`: Order dikirim

## 📊 Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Public (GET) | 100 req/min |
| Authenticated | 300 req/min |
| Admin | 1000 req/min |
| Cron | No limit |

## 🧪 Testing

### Postman Collection

Import collection untuk testing:
```bash
# Download Postman collection
curl -O http://localhost:3000/api/docs/postman.json
```

### Test Credentials

Development environment menyediakan test users:

| Email | Password | Role |
|-------|----------|------|
| admin@vesta.com | admin123 | ADMIN |
| producer@vesta.com | producer123 | PRODUCER |
| warehouse@vesta.com | warehouse123 | WAREHOUSE |
| consumer@vesta.com | consumer123 | CONSUMER |
| business@vesta.com | business123 | BUSINESS |

## 💡 Best Practices

### 1. Idempotency
Untuk operasi mutasi, gunakan idempotency key:
```javascript
headers: {
  'X-Idempotency-Key': uuid()
}
```

### 2. Pagination (Coming Soon)
Untuk list endpoints, gunakan pagination:
```bash
GET /api/batches?page=1&limit=20
```

### 3. Caching
Public endpoints dapat di-cache. Perhatikan header:
```
Cache-Control: public, max-age=300
```

### 4. Retry Logic
Implementasikan exponential backoff untuk retry:
```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status < 500) throw new Error('Client error');
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## 🛠️ SDK & Libraries

### JavaScript/TypeScript
```bash
npm install @vesta/sdk
```

```typescript
import { VestaClient } from '@vesta/sdk';

const client = new VestaClient({
  baseUrl: 'https://api.vesta.com',
  apiKey: 'YOUR_API_KEY'
});

// Create batch
const batch = await client.batches.create({
  productId: 1,
  warehouseId: 1,
  harvestDate: '2026-10-20',
  quantityKg: 500,
  storageTempC: 5.0
});

// Place order
const order = await client.orders.create({
  items: [{ batchId: 123, quantityKg: 10 }],
  deliveryAddress: 'Jl. Raya No. 123'
});
```

### Python (Coming Soon)
```python
from vesta import VestaClient

client = VestaClient(api_key='YOUR_API_KEY')
batch = client.batches.create(
    product_id=1,
    warehouse_id=1,
    harvest_date='2026-10-20',
    quantity_kg=500,
    storage_temp_c=5.0
)
```

## 📞 Support

- **Email**: api-support@vesta-marketplace.com
- **Discord**: https://discord.gg/vesta
- **GitHub Issues**: https://github.com/vesta/api/issues
- **Documentation**: https://docs.vesta-marketplace.com

## 📝 Changelog

### v1.0.0 (2026-10-26)
- Initial API release
- Core endpoints: batches, orders, rescue deals
- Cascade engine dengan simulasi waktu
- Admin configuration API
- OpenAPI 3.1 specification
- Swagger UI documentation

---

**Vesta Marketplace** - Reducing food waste through intelligent cascade pricing 🌱
