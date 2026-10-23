# 📋 Vesta Production Checklist
# Pre-deployment verification steps before deploying to Vercel

## ✅ Pre-Deployment Checklist

### Database & Prisma
- [ ] `DATABASE_URL` terisi dengan connection string yang valid
- [ ] `npx prisma generate` sudah dijalankan setelah schema berubah
- [ ] `npx prisma migrate deploy` sukses (semua migration terapply)
- [ ] Skema database sesuai dengan `prisma/schema.prisma` (atau contract.prisma)
- [ ] Seed data sudah dijalankan: `npx tsx src/prisma/seed.ts`
- [ ] Tabel wajib ada: Users, Batches, Products, Orders, CascadeEvents, BuyerTier, RescueDeals, FeedListings, ResidueListings

### Environment Variables
- [ ] `DATABASE_URL` terisi dengan connection string yang valid (Supabase/Neon)
- [ ] `NEXTAUTH_SECRET` di-generate (32+ karakter random): `openssl rand -hex 32`
- [ ] `NEXTAUTH_URL` sesuai domain Vercel app (https://vesta.vercel.app)
- [ ] `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` untuk sandbox terisi
- [ ] `FONNTE_API_TOKEN` untuk WhatsApp notification terisi
- [ ] `SIMULATE_TIME_ENABLED="true"` untuk fitur demo lomba
- [ ] `NEXT_PUBLIC_SUPABASE_URL` dan `KEY` (opsional, jika menggunakan Supabase Auth)
- [ ] Semua environment variables dicek di dashboard Vercel (bukan hanya lokal .env)

### Application Configuration
- [ ] `next.config.ts` memiliki `output: "standalone"` (sudah di-set)
- [ ] `next.config.ts` memiliki `serverExternalPackages: ["@react-pdf/renderer"]`
- [ ] Tailwind CSS v4 konfigurasi sudah benar di `tailwind.config.ts` (jika ada)
- [ ] `proxy.ts` sudah konfigurasi MAINTENANCE_MODE dan bypass key
- [ ] API routes validasi menggunakan Zod (cek `app/api/*/route.ts`)
- [ ] Error handling sudah implemented untuk semua endpoint

### Demo & Simulation
- [ ] `SIMULATE_TIME_ENABLED="true"` aktif di environment variables
- [ ] `POST /api/demo/simulate-tick` endpoint bekerja dengan benar
- [ ] Batch cascade transisi: FRESH → RESCUE → FEED → RESIDUE → DISPOSED
- [ ] Freshness score perhitungan sesuai rumus: `F = 100 × max(0, 1 - (t_simpan × k_suhu + t_kirim) / S_komoditas)`
- [ ] Rescue Deal dibuat otomatis saat skor < 70
- [ ] Early access benefits berdasarkan loyalty tier bekerja:
  - Starter: 0 jam
  - Silver: +2 jam
  - Gold: +6 jam
  - Platinum: +12 jam

### Database Data Verification
- [ ] 9 batch demo ter-seed dengan berbagai status cascade:
  - 6 batch FRESH (skor ≥ 70)
  - 1 batch RESCUE (skor < 70)
  - 1 batch FEED (skor < 30)
  - 1 batch RESIDUE (skor < 10)
  - 1 batch DISPOSED (skor 0)
- [ ] 4 demo accounts terbuat:
  - Admin: admin@vesta.id / Vesta123!
  - Producer: produsen@vesta.id / Vesta123!
  - Warehouse: gudang@vesta.id / Vesta123!
  - Consumer: b2c@vesta.id / Vesta123!
  - Business: b2b@vesta.id / Vesta123!
- [ ] Loyalty tier data terisi sesuai tier:
  - Starter: totalSpend30d < 500rb, quota 2/minggu
  - Silver: totalSpend30d ≥ 500rb, quota 5/minggu, +2 jam early access
  - Gold: totalSpend30d ≥ 2jt, quota 12/minggu, +6 jam early access
  - Platinum: totalSpend30d ≥ 5jt, quota 25/minggu, +12 jam early access

### CI/CD Pipeline
- [ ] `.github/workflows/ci.yml` berhasil lintek dan build
- [ ] `.github/workflows/deploy.yml` siap deploy ke Vercel pada merge ke main
- [ ] Workflow testing di branch fitur sebelum merge

### Domain & SSL
- [ ] Vercel domain terverifikasi (atau siap digunakan)
- [ ] SSL certificate aktif (Vercel otomatis)
- [ ] Custom domain dikonfigurasi jika dibutuhkan (b2b.vesta.id dst)

### Post-Deployment Verification
- [ ] `npm run build` sukses di Vercel
- [ ] `npm run start` server jalan di Vercel
- [ ] Halaman utama (`/`) terbuka tanpa error
- [ ] Login akun demo berhasil (satu-satu test)
- [ ] `GET /api/batches` mengembalikan data batch
- [ [ ] `POST /api/demo/simulate-tick` mengubah status batch
- [ ] `GET /api/tiers/me` menampilkan tier dan kuota yang benar
- [ ] `GET /api/deals` menampilkan Rescue Deal jika ada batch RESCUE
- [ ] WhatsApp notification (jika Fonnte terintegrasi) tes manual
- [ ] Fallback data siap jika API error (mock data dari fallback-data.json)

### Rollback Plan
- [ ] Tahu cara rollback ke versi sebelumnya (`vercel revert`)
- [ ] Database migration rollback tercatat (`prisma migrate resolve --rolled-back`)
- [ ] Environment variables backup sebelum perubahan besar
- [ ] Kontak tim jika deploy gagal di jam kerja

---

## ⚠️ Common Issues & Solutions

| Masalah | Solusi |
|---------|--------|
| **Build gagal** | Cek `npm run build` lokal dulu, periksa error di Vercel Logs |
| **Database connection error** | Cek DATABASE_URL format, pastikan IP allowlist Supabase tidak diblok |
| **Auth error (NEXTAUTH)** | Cek NEXTAUTH_SECRET 32+ chars dan NEXTAUTH_URL sesuai domain |
| **Simulate-time tidak bekerja** | Cek SIMULATE_TIME_ENABLED="true" dan API endpoint tersedia |
| **Rescue Deal tidak muncul** | Cek batch status RESCUE di database dan freshness score < 70 |
| **Loyalty tier kuota salah** | Cek totalSpend30d di BuyerTier table dan formula tier promotion |
| **Fonnte tidak kirim** | Cek FONNTE_API_TOKEN dan nomor WhatsApp terdaftar di Fonnte sandbox |

---

## 🚨 Emergency Procedures

### Jika Deploy Gagal di Vercel
1. Cek Vercel Build Logs untuk error spesifik
2. `vercel rollback` ke versi sebelumnya jika perlu
3. Periksa environment variables di dashboard Vercel
4. `npx prisma migrate reset` hanya untuk development lokal (bukan produksi)

### Jika Database Error
1. Cek Supabase/Neon dashboard untuk status database
2. Periksa DATABASE_URL format dan konektivitas
3. `npx prisma migrate status` untuk melihat status migration
4. `npx prisma migrate resolve --rolled-back <name>` jika migration stuck

### Jika Simulate-Time Error
1. Pastikan `SIMULATE_TIME_ENABLED="true"` di environment
2. Cek `POST /api/demo/simulate-tick` endpoint logs
3. Pastikan ada batch FRESH di database yang bisa discore
4. Manual update freshness score via database jika perlu

---

## ✅ Sign-off

Deployment ready by: _______________________
Reviewed by: _______________________