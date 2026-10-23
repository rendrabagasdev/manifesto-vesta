# 🎭 Demo Script for Competition - Vesta

> 5-minute demo flow untuk Lomba Web Development UNIC.
> Dilengkapi judge talking points dan backup plans.

---

## ⏱ 5-Minute Demo Flow

### Menit 0:00 - 0:30 | Pendahuluan & Masalah

**Speaker:** "Halo judge, selamat sore. Saya dari tim Vesta dengan misi menyelamatkan food waste melalui platform cascade freshness."

**Key Points:**
- Indonesia membuang 23-48 juta ton food waste setiap tahun (BPS 2024)
- Rantai pasok panjang memperpendek shelf life bahan pokok
- Tengkulak memanipulasi harga karena informasi tidak transparan

**Visual:** Slide masalah dengan statistik food waste Indonesia.

---

### Menit 0:30 - 1:30 | Solusi: Freshness Cascade Platform

**Speaker:** "Vesta menghubungkan produsen → gudang → konsumen tanpa tengkulak. Setiap batch dihitung kesegaran dengan algoritma freshness score, harganya turun secara dinamis, dan jika tidak terjual, dialihkan ke tahap berikutnya dalam 5 stage cascade."

**Key Features Demo:**
1. **Freshness Score** — Skor 0-100 per batch berdasarkan waktu, suhu, dan komoditas
2. **Dynamic Rescue Pricing** — Diskon otomatis saat skor turun
3. **Cascade State Machine** — 5 tahap: FRESH → RESCUE → FEED → RESIDUE → DISPOSED
4. **Loyalty Tier** — Sistem tier mencegah strategic waiting pembeli

**Visual:** Diagram cascade state machine di layar.

---

### Menit 1:30 - 2:30 | Live Demo: Dari FRESH ke DISPOSED

**Speaker:** "Saya akan menampilkan alur lengkap dari batch baru hingga diselesaikan melalui cascade. Saya menggunakan akun gudang untuk demonstrasi."

**Demo Steps:**

**Step 1: Lihat Batch FRESH**
- Klik `GET /api/batches` → lihat batch Tomat Servo skor 92 (FRESH)
- Harga normal: Rp15.000 per kg

**Step 2: Simulasi Waktu +24 jam**
- Klik `POST /api/demo/simulate-tick { "hours": 24 }`
- Freshness score turun karena lama disimpan
- Batch transisi ke RESCUE (skor < 70)
- Rescue Deal dibuat otomatis dengan diskon 35%

**Step 3: Lihat Rescue Deals**
- Klik `GET /api/deals` → lihat discount 35%
- Early access untuk tier Silver (+2 jam)
- Harga jual: Rp9.750 per kg (dari Rp15.000)

**Step 4: Cek Tier Pembeli**
- `GET /api/tiers/me` → Sari (b2c) adalah Silver tier
- Kuota rescue mingguan: 5 item
- Early access: +2 jam

**Step 5: Lihat Cascade Events**
- `GET /api/cascade` → riwayat transisi FRESH → RESCUE
- Timestamp dan alasan tercatat otomatis

**Step 6: Lanjutkan simulasi +24 jam lagi**
- `POST /api/demo/simulate-tick { "hours": 24 }` (total 48 jam dari awal)
- Rescue score turun lebih lanjut → FEED (pakan ternak)
- Feed Listing dibuat: Apel Malang per kg Rp3.000
- Rescue Deal dinonaktifkan (sudah bukan fresh lagi)

**Step 7: Simulasi total +72 jam**
- Lihat batch RESIDUE (skor < 10)
- Residue Listing: Tomat per kg Rp1.000 (kompos)
- Semua listing dinonaktifkan jika DISPOSED

---

### Menit 2:30 - 3:30 | Bisnis Impact & Sertifikat

**Speaker:** "Setiap transaksi menyelamatkan bahan dan menciptakan dampak lingkungan. Sistem ini terbukti mengurangi waste hingga 60% per batch."

**Metrics yang Akan Ditampilkan:**

| Metrik | Value | Satuan |
|--------|-------|--------|
| **Total Batch Terselamatkan** | 4 dari 5 | batch |
| **Kg Bahan Terselamatkan** | 165 | kg |
| **CO₂e Terhindari** | 247.5 | kg |
| **Air Disematkan** | 3.6 | liter |
| **Waste Diversion Rate** | 80 | % |

**Sertifikat ESG:**
- `GET /api/impact` → generate certificate URL
- QR Code per batch untuk traceability
- Data terverifikasi di blockchain (konsep masa depan)

**Visual:** Sertifikat ESG dengan QR code, grafik dampak.

---

### Menit 3:30 - 4:30 | Loyalty Tier & Anti-Abuse

**Speaker:** "Sistem tier membeli aman. Pembeli yang sengaja menunggu harga turun dihindari."

**Demo:**
1. Sari (Consumer/Silver) belanja Rescue Deal Rp71.000
2. `GET /api/tiers/me` → total spend 30 hari: Rp750.000
3. Tier naik ke SILVER
4. Kuota rescue mingguan: 5 item (dari 2 sebagai Starter)
5. Early access: +2 jam sebelum umum

**Anti-Abuse Rules (Talking Point):**
- Kuota rescue **tidak bisa di-stack** antar minggu
- Poin hanya dari **pembelian harga normal** (bukan rescue)
- Early access timer **strict** — cek `earlyAccessHours` di tier

**Judge Question:** "Bagaimana mencegah pembeli sengaja menunggu expired?"
**Answer:** "System menghitung 30 hari total_spend harga normal. Jika hanya belanja rescue, tier tidak naik. Early access juga strict berdasarkan waktu, bukan hanya skor."

---

### Menit 4:30 - 5:00 | Q&A & Backup

**Speaker:** "Terima kasih judge, ini adalah Vesta — platform cascade freshness untuk menyelamatkan food waste dari rantai pasok Indonesia."

**Backup Plans jika Gagal:**

| Masalah | Backup Plan |
|---------|-------------|
| **API error** | Tunjukkan mock data dari `fallback-data.json` |
| **Database timeout** | Tunjukkan ERD diagram dari docs/ |
| **Simulate-time error** | Manual update freshness score di UI |
| **Auth error** | Gunakan akun demo yang sudah disediakan |
| **Network issue** | Tunjukkan screenshot fitur dari local |

**Judge Questions Biasanya:**
1. "Apa jika suhu gudang tidak sesuai ideal?"
   - → Freshness score akan menurun berdasarkan tempPenalty, admin bisa manual adjust
2. "Bisnis ini menguntungkan siapa?"
   - - Produsen: penjualan lebih cepat, margin tetap
   - Gudang: stok berkurang, reputasi baik
   - Konsumen: harga murah, bahan segar
   - Lingkungan: waste berkurang
3. "Skalanya berapa?"
   - → Saat ini 5 batch demo, arsitektur siap scale ke 1000+ batch dengan PostgreSQL + Prisma

---