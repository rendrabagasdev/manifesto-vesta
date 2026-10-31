# Vesta — Freshness Cascade Platform

Marketplace bahan pokok segar yang menghubungkan produsen → gudang → konsumen tanpa tengkulak dengan sistem cascade 5 tahap (*FRESH → RESCUE → FEED → RESIDUE → DISPOSED*).

## 📚 Dokumentasi API

Vesta menyediakan REST API lengkap untuk integrasi eksternal:

- **Swagger UI (Interactive)**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **OpenAPI Spec**: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)
- **Postman Collection**: [http://localhost:3000/api/docs/postman.json](http://localhost:3000/api/docs/postman.json)
- **Dokumentasi Lengkap**: [docs/API_README.md](docs/API_README.md)
- **Contoh Integrasi**: [docs/examples/integration.ts](docs/examples/integration.ts)

### Quick API Access
```bash
# Health check
curl http://localhost:3000/api/health

# Get product breakdown
curl http://localhost:3000/api/products/1/breakdown

# Download Postman collection
curl http://localhost:3000/api/docs/postman.json > vesta-api.json
```

Lihat [docs/README.md](docs/README.md) untuk panduan lengkap API.

---

## 🐳 Menjalankan dengan Docker

Pastikan Docker & Docker Compose sudah terpasang.

### 1. Siapkan Environment Variables
```bash
cp .env.example .env
```

### 2. Jalankan Container (Next.js + PostgreSQL)
```bash
docker compose up --build -d
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **PostgreSQL Database**: `localhost:5432`
  - User: `postgres`
  - Password: `postgres`
  - Database: `vesta`

### 3. Menghentikan Container
```bash
docker compose down
```
*(Tambahkan `-v` jika ingin menghapus volume database: `docker compose down -v`)*

---

## 💻 Menjalankan secara Lokal (Tanpa Docker)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🏗️ Arsitektur & Fitur Utama

### Cascade Freshness System
Produk otomatis berpindah status berdasarkan freshness score (0-100):
- **FRESH** (70-100): Harga normal
- **RESCUE** (40-69): Diskon 35% dengan time-limited deals
- **FEED** (20-39): Diskon 80% untuk pakan ternak
- **RESIDUE** (0-19): Diskon 95% untuk kompos/biogas
- **DISPOSED**: Tracked untuk sustainability metrics

### Role-Based Access Control (RBAC)
- **CONSUMER**: Pembeli retail
- **BUSINESS**: Pembeli B2B (bulk orders, preorders)
- **PRODUCER**: Petani/produsen (input batch)
- **WAREHOUSE**: Manajer gudang (quality control)
- **ADMIN**: Platform administrator

### Loyalty & Tier System
Konsumen mendapatkan tier berdasarkan loyalty points:
- **Bronze**: 2 rescue deals/minggu
- **Silver**: 3 rescue deals/minggu
- **Gold**: 5 deals/minggu + 2 jam early access
- **Platinum**: Unlimited deals + 2 jam early access

### Key Features
- ✅ Batch tracking dengan QR code
- ✅ Dynamic pricing berdasarkan freshness
- ✅ Time-limited rescue deals dengan tier-based access
- ✅ WhatsApp notifications (Fonnte integration)
- ✅ Payment gateway (Midtrans Snap)
- ✅ Impact tracking (food waste prevention metrics)
- ✅ Admin dashboard untuk konfigurasi cascade
- ✅ Time simulation untuk demo/testing
- ✅ REST API untuk integrasi eksternal

---

## 🧪 Testing

### Demo Accounts
Gunakan akun berikut untuk testing berbagai role:

```
ADMIN:     admin@vesta.id / Vesta123!
           - Akses penuh ke dashboard admin
           - Konfigurasi cascade pricing, tier system
           - Simulasi waktu untuk demo

PRODUCER:  produsen@vesta.id / Vesta123!
           - Input batch/produk baru
           - Monitor penjualan & pembayaran
           - Generate QR code batch

WAREHOUSE: gudang@vesta.id / Vesta123!
           - Quality control & temperature tracking
           - Update status batch
           - Manage inventory

CONSUMER:  b2c@vesta.id / Vesta123!
           - Browse marketplace produk fresh
           - Akses rescue deals (diskon)
           - Beli pakan & residu via keranjang
           - Loyalty tier benefits

BUSINESS:  b2b@vesta.id / Vesta123!
           - Bulk order & preorder
           - Pricing khusus B2B
           - Corporate account features
```

### Marketplace Flow
Semua pembelian (marketplace, pakan, residu, rescue deals) menggunakan alur yang sama:
1. Browse produk
2. **Tambah ke Keranjang** 
3. View cart → Atur lokasi pengiriman (map picker)
4. **Checkout dengan COD** (bayar saat tiba)

### Test Credentials
```
ADMIN:     admin@vesta.id / Vesta123!
PRODUCER:  produsen@vesta.id / Vesta123!
WAREHOUSE: gudang@vesta.id / Vesta123!
CONSUMER:  b2c@vesta.id / Vesta123!
BUSINESS:  b2b@vesta.id / Vesta123!
```

### API Testing dengan Postman
1. Import collection dari: `http://localhost:3000/api/docs/postman.json`
2. Set environment variables: `base_url`, `session_token`, `cron_secret`
3. Login ke web app dan copy session token dari browser cookies
4. Test endpoints dari Postman

### Time Simulation (Demo Mode)
```bash
# Set di .env
SIMULATE_TIME_ENABLED=true

# Simulasi waktu maju 48 jam
curl -X POST http://localhost:3000/api/demo/simulate-tick \
  -H "Content-Type: application/json" \
  -d '{"hours": 48}'
```

---

## ⚠️ Known Issues & Fixes

### Map Container Errors (Fixed)
**Status**: ✅ Fixed in latest version

**Masalah yang pernah terjadi**:
- `TypeError: undefined is not an object (evaluating 'this.getPane().appendChild')`
- `Error: Map container is being reused by another instance`

**Penyebab**: Leaflet map instance tidak di-cleanup dengan benar saat navigasi/city change di cart page.

**Solusi**: 
- MapContainer sekarang force remount saat koordinat berubah
- Menggunakan state counter untuk track remount key
- Map instance lama di-cleanup sebelum yang baru dibuat

**Affected Pages**: Cart page (delivery location picker)

### Hydration Mismatch (Fixed)
**Status**: ✅ Fixed in latest version

**Masalah**: Format currency IDR berbeda antara server render dan client render

**Solusi**: Tambah `suppressHydrationWarning` pada element yang menggunakan `formatIdr()`

---

## 📖 Dokumentasi Lengkap

- **API Documentation**: [docs/API_README.md](docs/API_README.md)
- **Quick Reference**: [docs/README.md](docs/README.md)
- **Integration Examples**: [docs/examples/integration.ts](docs/examples/integration.ts)
- **OpenAPI Spec**: [docs/openapi.yaml](docs/openapi.yaml)
- **Postman Collection**: [docs/postman_collection.json](docs/postman_collection.json)

---

## 🚀 Deploy on Vercel

1. Push repository ke GitHub
2. Import project di [Vercel](https://vercel.com/new)
3. Set environment variables (lihat `.env.example`)
4. Deploy!

### Cron Setup (Cascade Tick)
Tambahkan di `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cascade-tick",
    "schedule": "0 * * * *"
  }]
}
```

---

## 🤝 Contributing

Contributions welcome! Lihat project structure di bawah untuk memahami kode.

### Project Structure
```
├── app/                      # Next.js App Router
│   ├── api/                  # REST API routes
│   │   ├── batches/         # Batch management endpoints
│   │   ├── orders/          # Order endpoints
│   │   ├── rescue-deals/    # Rescue deal endpoints
│   │   ├── admin/           # Admin config endpoints
│   │   ├── demo/            # Time simulation
│   │   └── cron/            # Cron jobs
│   ├── actions/             # Server Actions
│   └── dashboard/           # Dashboard pages
├── src/
│   ├── lib/                 # Business logic
│   │   ├── cascade/         # Cascade engine
│   │   ├── batches/         # Batch management
│   │   ├── orders/          # Order processing
│   │   ├── loyalty/         # Loyalty & tier system
│   │   ├── pricing/         # Dynamic pricing
│   │   └── notifications/   # WhatsApp integration
│   └── prisma/              # Database ORM
└── docs/                    # API Documentation
    ├── API_README.md        # Full API guide
    ├── openapi.yaml         # OpenAPI spec
    └── examples/            # Integration examples
```

---

## 📞 Support

- **Email**: support@vesta-marketplace.com
- **API Support**: api-support@vesta-marketplace.com
- **Documentation**: [docs/README.md](docs/README.md)

---

**Vesta Marketplace** - Reducing food waste through intelligent cascade pricing 🌱
