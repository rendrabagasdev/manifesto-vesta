# 🚀 Deployment Guide - Vesta

> Panduan lengkap deployment ke Vercel dengan Supabase/Neon PostgreSQL.

---

## 📦 Vercel Deployment Steps

### 1. Persiapan Repository

```bash
# Clone repository
git clone https://github.com/your-org/vesta.git
cd vesta

# Install dependencies
npm install

# Build untuk development
npm run build

# Jalankan dev server
npm run dev
```

### 2. Vercel Dashboard

1. Buka [vercel.com](https://vercel.com)
2. Klik "New Project"
3. Import dari GitHub repository
4. Framework Detection: **Next.js** (otomatis)
5. Root Directory: `.` (root)
6. Output Directory: `next build` akan otomatis mendeteksi

### 3. Environment Variables di Vercel

Tambahkan semua variable di tab **Settings → Environment Variables**:

```env
# Database
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# Auth
NEXTAUTH_SECRET="rahasia-super-panjang-minimal-32-huruf"
NEXTAUTH_URL="https://vesta.vercel.app"

# Supabase (opsional jika menggunakan)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsIn..."

# Payment (Sandbox)
MIDTRANS_SERVER_KEY="SERVER-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MIDTRANS_CLIENT_KEY="KEY-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# WhatsApp (Sandbox)
FONNTE_API_TOKEN="your-fonnte-token"

# Demo Control
SIMULATE_TIME_ENABLED="true"
```

### 4. Deploy

```bash
# Deploy ke Vercel
vercel

# Atau dengan alias
vercel --alias vesta.com
```

---

## 🗄 Database Setup (Supabase / Neon)

### Option A: Supabase

```bash
# 1. Buat project di supabase.com
# 2. Buat database baru
# 3. Copy DATABASE_URL dari Settings → Database → Connection string

# 4. Jalankan migrasi
npx prisma migrate dev --name "init"

# 5. Deploy schema ke Supabase
npx prisma migrate deploy

# 6. Seed data demo
npx tsx src/prisma/seed.ts
```

### Option B: Neon

```bash
# 1. Buat project di neon.tech
# 2. Copy connection string dari dashboard
# 3. Update .env dengan DATABASE_URL Neon

# 4. Jalankan migrasi seperti di Supabase
npx prisma migrate dev --name "init"
npx prisma migrate deploy
```

### ⚠️ Penting: Prisma Schema

Setelah mengubah `prisma/schema.prisma`, selalu jalankan:

```bash
npx prisma migrate dev --name "deskripsi_perubahan"
npx prisma generate
```

---

## ⚙️ Prisma Migration Commands

```bash
# 1. Buat migration baru setelah schema berubah
npx prisma migrate dev --name "add_rescue_deals_table"

# 2. Lihat SQL sebelum apply
# Akan terbuka editor dengan SQL query

# 3. Apply ke database
# Tekan "yes" di editor

# 4. Generate client types
npx prisma generate

# 5. Lihat di Prisma Studio
npx prisma studio

# 6. Rollback migration
npx prisma migrate resolve --rolled-back --rolled-back-20240101_add_feature

# 7. Reset seluruh database (dev only)
npx prisma migrate reset
-- Masukkan nama migration terakhir
```

---

## 🎯 Demo Account Credentials

| Role | Email | Kata Sandi | Fitur |
|------|-------|-----------|-------|
| **Admin** | admin@vesta.id | Vesta123! | Kelola tier, harga, monitoring, simulate-time |
| **Producer** | produsen@vesta.id | Vesta123! | Input stok, panen, harga dasar |
| **Warehouse** | gudang@vesta.id | Vesta123! | Cek kualitas, suhu, update status |
| **Consumer** | b2c@vesta.id | Vesta123! | Marketplace, Rescue Deal per tier |
| **Business** | b2b@vesta.id | Vesta123! | Order besar, pre-order, pakan |

**Catatan:** Semua akun memiliki data batch yang sudah seeded dengan berbagai status cascade (FRESH → RESCUE → FEED → RESIDUE → DISPOSED).

---

## ⏱ Simulate-Time Usage for Judges

### Fitur untuk Lomba

Simulate-time memungkinkan percepatan waktu untuk demo tanpa menunggu hari-real.

**Endpoint:**
```http
POST /api/demo/simulate-tick
Body: { "hours": 24 }
```

**Alur Demo:**

1. **Mulai:** Semua batch di status FRESH dengan skor tinggi
2. **Simulasi 24 jam:** `hours: 24`
   - Freshness score turun berdasarkan waktu dan suhu
   - Batch yang skor < 70 → transisi ke RESCUE
   - Batch yang skor < 30 → transisi ke FEED
   - Batch yang skor < 10 → transisi ke RESIDUE
   - Batch yang skor 0 → transisi ke DISPOSED

3. **Simulasi 48 jam:** `hours: 48`
   - Rescue deals dibuat dengan harga dinamis
   - Early access berdasarkan tier pembeli
   - Transisi cascade audit log tercatat

**Tips untuk Judge:**
- Mulai dari state FRESH (batch baru panen)
- Simulasi 72+ jam untuk melihat seluruh cascade
- Cek `GET /api/tiers/me` untuk melihat early access benefits
- Cek `GET /api/deals` untuk Rescue Deals aktif
- Lihat `GET /api/impact` untuk aggregat dampak

---

## 📋 Checklist Sebelum Deploy

- [ ] `DATABASE_URL` terisi dengan connection string yang valid
- [ ] `NEXTAUTH_SECRET` di-generate (32+ karakter random)
- [ ] `NEXTAUTH_URL` sesuai domain Vercel app
- [ ] `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` untuk sandbox
- [ ] `FONNTE_API_TOKEN` untuk WhatsApp notification
- [ ] `SIMULATE_TIME_ENABLED="true"` untuk fitur demo
- [ ] `NEXT_PUBLIC_SUPABASE_URL` dan `KEY` (opsional)
- [ ] `prisma/schema.prisma` sudah sesuai kebutuhan
- [ ] `npx prisma generate` sudah dijalankan
- [ ] `npx prisma migrate deploy` sudah sukses
- [ ] Seed data sudah dijalankan (`npx tsx src/prisma/seed.ts`)
- [ ] Semua environment variables dicek di dashboard Vercel

---