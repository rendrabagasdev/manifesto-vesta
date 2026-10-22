# Rekomendasi Tech Stack & Strategi Eksekusi 8 Hari
**Proyek:** Freshness Cascade Platform  
**Event:** Lomba Web Development UNIC (Tema: Ekosistem Digital / Food Waste)  
**Target:** Demo MVP Siap Presentasi (H-8 Deadline)  
**Pilihan Stack:** **Opsi A — Next.js Fullstack Architecture**

---

## 1. Arsitektur Utama (Opsi A)

Pilihan **Next.js Fullstack (App Router)** digunakan sebagai single repository / monorepo untuk menyatukan Frontend UI dan Backend API dalam satu codebase. Pendekatan ini menghilangkan *overhead* konfigurasi CORS, autentikasi beda domain, dan kompleksitas deployment ganda.

```
+-----------------------------------------------------------------------+
|                           CLIENT / FRONTEND                           |
|  React 18 + Next.js App Router | Tailwind CSS | shadcn/ui Component   |
|  Dashboard 7 Peran | Simulate Time Control | Public Impact Counter    |
+-----------------------------------------------------------------------+
                                   |
                         (Internal REST / Actions)
                                   v
+-----------------------------------------------------------------------+
|                         BACKEND ROUTE HANDLERS                        |
|  Freshness Score Algorithm  | Loyalty & Tier Engine                   |
|  Dynamic Rescue Pricing     | Cascade State Machine (Fresh->Disposed) |
+-----------------------------------------------------------------------+
                                   |
          +------------------------+------------------------+
          |                        |                        |
          v                        v                        v
+--------------------+   +--------------------+   +--------------------+
|  DATABASE & ORM    |   |  EXTERNAL APIS     |   |  DOCUMENT & GENERATION
| PostgreSQL         |   | Midtrans (Sandbox) |   | @react-pdf/renderer|
| (Supabase/Neon)    |   | Fonnte (WhatsApp)  |   | (Sertifikat Impact)|
| Prisma ORM         |   | BMKG & PIHPS Mock  |   | qrcode.react       |
+--------------------+   +--------------------+   +--------------------+
```

---

## 2. Rincian Technology Stack

| Layer | Teknologi Terpilih | Fungsi & Alasan Teknis |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14+ (App Router)** | Fullstack Framework. Menyediakan Rendering UI tercepat dan API Route terintegrasi. |
| **Language** | **TypeScript** | *Type safety* penuh dari database hingga komponen UI untuk mencegah bug runtime saat demo. |
| **UI Styling** | **Tailwind CSS + shadcn/ui** | Komponen UI accessible dan profesional (Table, Dialog, Select, Badge, Card) siap pakai tanpa perlu desain dari nol. |
| **Database** | **PostgreSQL (Supabase / Neon.tech)** | Relational DB cloud terunggul untuk menangani 15+ tabel terintegrasi (batch, cascade, order, tier). |
| **ORM** | **Prisma ORM** | Mempercepat query DB, otomatisasi migrasi skema, dan autogenerate TypeScript types secara instan. |
| **Authentication** | **Supabase Auth / NextAuth.js** | Menangani Role-Based Access Control (RBAC) untuk 7 peran pengguna. |
| **PDF Generation** | **`@react-pdf/renderer`** | Membuat Sertifikat Impact ESG berformat PDF langsung di server/client menggunakan JSX. |
| **QR Code** | **`qrcode.react`** | Merender QR Code acuan traceability produk yang dapat di-scan juri. |
| **Integration** | **Midtrans Sandbox & Fonnte WA** | Gateway pembayaran simulasi dan notifikasi WhatsApp deal secara otomatis. |
| **Deployment** | **Vercel Platform** | Continuous Deployment (CD) otomatis dari GitHub dalam hitungan detik. |

---

## 3. Strategi Pintas (Shortcuts) & Mitigasi Lomba

Untuk memastikan seluruh alur PRD yang kompleks dapat didemonstrasikan dengan lancar di depan juri tanpa risiko kegagalan teknis:

### A. Engine "Simulate Time"
* **Masalah:** Penurunan *Freshness Score* dan transisi tahap (Fresh -> Rescue -> Feed -> Residue -> Disposed) membutuhkan waktu hari/jam.
* **Solusi:** Buat API Route khusus `/api/demo/simulate-tick`.
  * Tombol **"Simulate Time"** di header UI akan memicu API ini untuk memajukan `simulated_current_time` di database (misal: +24 jam).
  * API langsung menghitung ulang kalkulasi rumus *Freshness Score*:
    $$F = 100 \times \max\left(0, 1 - \frac{t_{simpan} \cdot k_{suhu} + t_{kirim}}{S_{komoditas}}\right)$$
  * Status batch yang melewati ambang batas ($F < 30$) otomatis dipindahkan ke tahap berikutnya dalam *cascade events*.

### B. Fallback API Eksternal
* **Masalah:** API BMKG (cuaca) atau API harga pasar publik bisa mengalami *rate-limiting* atau *downtime* saat sesi presentasi.
* **Solusi:** Bungkus panggilan API eksternal dengan *wrapper function* yang memiliki timeout 1.5 detik. Jika tidak merespons, sistem secara otomatis mengambil data lokal (`fallback-data.json`).

### C. WhatsApp & Payment Sandbox
* **Integrasi WA:** Daftarkan nomor penguji/demo ke Fonnte Sandbox agar notifikasi *Early Access Rescue Deal* (khusus Tier Gold/Platinum) terbukti terkirim ke HP nyata.
* **Pembayaran:** Gunakan Midtrans Snap mode Sandbox untuk menampilkan pop-up instruksi pembayaran tanpa transaksi uang asli.

---

## 4. Timeline Rencana Eksekusi Sprint 8 Hari

```
[H-8 s/d H-7] FONDASI & DATABASE
 ├── Setup Next.js App Router + TypeScript + Tailwind + shadcn/ui
 ├── Inisialisasi Prisma ORM Schema (15+ tabel PRD)
 ├── Setup Auth & Role Seeding (Produsen, Gudang, B2C, B2B, Admin, dll.)
 └── Mock Data Seeding (Komoditas, Shelf Life, Pasokan Awal)

[H-6 s/d H-5] LOGIK INTI & ENGINE
 ├── CRUD Batch Pasokan & Gudang
 ├── Algoritma Freshness Score & Dynamic Rescue Pricing
 ├── Endpoint & Fitur `/api/demo/simulate-tick` (Simulate Time)
 └── Marketplace Katalog B2C & B2B

[H-4 s/d H-3] TIER, CASCADE & MARKETPLACE RESIDUE
 ├── Sistem Loyalty Tier, Kalkulasi Poin, Kuota & Anti-Abuse Rules
 ├── Early Access Timer berdasarkan Tier (Gold vs Starter)
 ├── Transisi Cascade (FEED & RESIDUE Marketplace)
 └── Notifikasi WhatsApp Gateway (Fonnte Sandbox)

[H-2] TRANSPARANSI & IMPACT LEDGER
 ├── Halaman Impact Counter Public & Waste Diversion Rate (WDR)
 ├── Halaman Traceability via QR Code (`/trace/[batchId]`)
 ├── Price Breakdown Visualizer (Petani vs Margin Platform)
 └── PDF Generator Sertifikat Dampak ESG (`@react-pdf/renderer`)

[H-1] POLISH, DRY-RUN & DEPLOYMENT
 ├── Integration Testing Alur Demo dari A sampai Z
 ├── Deployment ke Vercel & Supabase Cloud
 ├── Penyiapan Skenario Presentasi Demo Juri
 └── Freeze Code
```

---

## 5. Ringkasan Kebutuhan Tabel Database (Prisma Schema Overview)

1. **`User` / `Account`**: Menyimpan credentials, role, dan relasi profil.
2. **`Producer` & `Warehouse`**: Profil produsen dan lokasi penyimpanan gudang.
3. **`Product` & `Batch`**: Katalog bahan pokok, tanggal panen, suhu simpan, dan `freshness_score`.
4. **`PriceBreakdown`**: Rincian harga dasar petani, biaya gudang, logistik, dan margin.
5. **`BuyerTier` & `LoyaltyLedger`**: Tracking total belanja normal 30 hari, tier status, poin, dan kuota rescue.
6. **`RescueDeal`**: Listing barang diskon dinamis + timer early access.
7. **`CascadeEvent`**: Audit log kepindahan status batch (`FRESH` -> `RESCUE` -> `FEED` -> `RESIDUE` -> `DISPOSED`).
8. **`FeedListing` & `ResidueListing`**: Katalog khusus pembeli pakan ternak dan pengolah pupuk/biogas.
9. **`Order` & `OrderItem`**: Transaksi pembelian seluruh tahapan.
10. **`ImpactLog`**: Catatan kg terselamatkan, CO2e dihindari, dan air dihemat untuk sertifikat ESG.

---

Dengan menggunakan **Next.js Fullstack (Opsi A)**, seluruh arsitektur ini dapat dibangun secara efisien, konsisten, dan siap dipresentasikan secara memukau dalam tenggat waktu 8 hari.