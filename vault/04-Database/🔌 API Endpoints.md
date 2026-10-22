---
tags: [teknis, api, endpoint]
---

# 🔌 API Endpoints

## Internal REST API

| Endpoint | Fungsi |
|----------|--------|
| `GET/POST /batches` | CRUD batch, status, Freshness Score |
| `GET /deals` | Daftar Rescue Deal aktif |
| `GET /deals/{id}/quota` | Sisa kuota rescue per pengguna |
| `POST /match` | Peringkat mitra terbaik untuk sebuah deal |
| `GET/POST /orders` | Pemesanan reguler |
| `GET/POST /preorders` | Pre-order |
| `GET /tiers/me` | Tier, poin, dan kuota pengguna saat ini |
| `GET /cascade` | Riwayat dan pemicu transisi tahap |
| `GET /feed` | Listing pakan ternak |
| `POST /feed/{id}/buy` | Pembelian pakan |
| `GET /residue` | Listing residue |
| `POST /residue/{id}/buy` | Pembelian residue |
| `GET /products/{id}/breakdown` | Rincian harga (price breakdown) |
| `GET /batches/{id}/trace` | Data QR traceability |
| `GET /impact` | Agregat dampak & sertifikat |

### Demo-Only Endpoints
| Endpoint | Fungsi |
|----------|--------|
| `POST /api/demo/simulate-tick` | Majukan waktu simulasi +24 jam |

## External API Integrations

| Layanan | Kegunaan | Catatan |
|---------|----------|--------|
| **BMKG** | Cuaca untuk estimasi shelf life & panen | Verifikasi endpoint saat implementasi |
| **OpenStreetMap / Maps** | Jarak, routing, Smart Matching | Pilih yang gratis |
| **Fonnte** (WhatsApp) | Notifikasi deal ke pembeli | Sandbox / akun uji |
| **Midtrans** | Pembayaran | Mode sandbox |
| **Data harga pasar** (PIHPS) | Benchmark harga | Input manual sebagai cadangan |

## Strategi Fallback

> [!IMPORTANT]
> Semua panggilan API eksternal dibungkus dengan timeout **1.5 detik**. Jika tidak merespons → ambil data dari `fallback-data.json`.

---

## Lihat Juga
- [[🏗 Arsitektur & Tech Stack]]
- [[🗄 Database Schema]]
- [[🎭 Strategi Demo]]
- [[🏠 Home]]
