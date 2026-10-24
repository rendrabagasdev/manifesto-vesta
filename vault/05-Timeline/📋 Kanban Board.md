---

tags:
  - timeline
  - kanban
  - tasks
kanban-plugin: board

---

## 📋 Kanban Board



## 📥 Backlog

- [ ] Skenario Presentasi Demo — draf ada, perlu diselaraskan dengan UI & Server Actions
- [ ] Freeze Code
- [ ] Pembersihan action legacy & duplikasi cart provider


## 🔨 In Progress

- [ ] Pembayaran Midtrans — Snap transaction dibuat; webhook rekonsiliasi belum ada
- [ ] WhatsApp Notification (Fonnte) — library ada; alur aktif belum memanggil, Notify Me masih no-op
- [ ] Simulate Time API — ADMIN + `SIMULATE_TIME_ENABLED` sudah; clock persisten/reset nyata belum
- [ ] Integration Testing End-to-End — 267 tes integrasi lolos; E2E browser belum
- [ ] Deploy produksi Docker → Fedora — workflow ada; deploy live & secrets belum diverifikasi
- [x] QR Code Traceability (`/trace/[batchId]`)
- [x] Halaman Impact Counter (Public)
- [x] PDF Sertifikat Impact ESG


## ✅ Done

- [x] Setup Auth & Role Seeding (5 peran)
- [x] Mock Data Seeding
- [x] Inisialisasi Prisma Schema (15+ tabel)
- [x] Algoritma Freshness Score
- [x] Setup Next.js App Router + TypeScript + Tailwind + shadcn/ui
- [x] Dynamic Rescue Pricing Engine
- [x] Cascade: FEED Marketplace
- [x] Cascade: RESIDUE Marketplace
- [x] Scheduler cascade produksi per jam
- [x] Marketplace Katalog B2C & B2B — katalog, cart, rescue, pakan/residu, pre-order
- [x] CRUD Batch Pasokan & Gudang
- [x] Early Access Timer per Tier
- [x] Price Breakdown Visualizer
- [x] Panel Konfigurasi Admin — ambang cascade, timer tahap, harga default, window rescue
- [x] Loyalty Tier System + Poin — earn/tier berjalan; expiry belanja 30 hari dijalankan tiap tick
- [x] Anti-Abuse Rules & Kuota — konsumsi kuota & stok atomik (row lock + tes konkurensi)
- [x] Order Fulfillment — admin/gudang: `PAID → SHIPPED` melepas reservasi + stok secara atomik, `SHIPPED → COMPLETED`; scope gudang + 15 tes integrasi
- [x] CRUD Produk & Harga Dasar — form produsen/admin, validasi Zod, jaga kepemilikan & produk yang masih dipakai batch; 9 tes integrasi
- [x] Lokalisasi Istilah UI — Fresh → Segar, Rescue → Layu, Freshness → Kesegaran; enum, URL, dan identifier internal tetap
- [x] Copy Marketplace Sederhana — tombol Beli & Masukkan keranjang, istilah "selamatkan" diganti "tidak terbuang", teks penjelasan dirapikan


## Lihat Juga

- [ ] [[⏱ Timeline Sprint 8 Hari]]
- [ ] [[🏠 Home]]




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[null]}
```
%%