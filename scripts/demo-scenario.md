# 🎭 Vesta Demo Scenario for UNIC Competition
# Step-by-step script for judges

## ⏱ Overall Duration: 5 minutes

## 📋 Pre-Demo Preparation
- [ ] Login as `gudang@vesta.id` (Warehouse role)
- [ ] Ensure SIMULATE_TIME_ENABLED=true in environment
- [ ] Verify database is seeded with demo data
- [ ] Have fallback mock data ready (`fallback-data.json`)

---

## 🎬 Demo Flow

### Phase 1: Introduction (Minutes 0:00 - 0:30)

**Speaker Talking Points:**
> "Halo judge, selamat sore. Saya dari tim Vesta dengan misi menyelamatkan food waste melalui platform cascade freshness."

**Key Points:**
- Indonesia membuang 23-48 juta ton food waste setiap tahun (BPS 2024)
- Rantai pasok panjang memperpendek shelf life bahan pokok
- Tengkulak memanipulasi harga karena informasi tidak transparant

**Visual:** Slide masalah dengan statistik food waste Indonesia.

---

### Phase 2: Solution Overview (Minutes 0:30 - 1:30)

**Speaker Talking Points:**
> "Vesta menghubungkan produsen → gudang → konsumen tanpa tengkulak. Setiap batch dihitung kesegaran dengan algoritma freshness score, harganya turun secara dinamis, dan jika tidak terjual, dialihkan ke tahap berikutnya dalam 5 stage cascade."

**Key Features to Highlight:**
1. **Freshness Score** — Skor 0-100 per batch berdasarkan waktu, suhu, dan komoditas
2. **Dynamic Rescue Pricing** — Diskon otomatis saat skor turun
3. **Cascade State Machine** — 5 tahap: FRESH → RESCUE → FEED → RESIDUE → DISPOSED
4. **Loyalty Tier** — Sistem tier mencegah strategic waiting pembeli

**Visual:** Diagram cascade state machine di layar.

---

### Phase 3: Live Demo - From FRESH to DISPOSED (Minutes 1:30 - 3:30)

**Speaker:** "Saya akan menampilkan alur lengkap dari batch baru hingga diselesaikan melalui cascade. Saya menggunakan akun gudang untuk demonstrasi."

**Step 1: Lihat Batch FRESH (Minute 1:30)**
- Action: `GET /api/batches`
- Expected: Lihat batch Tomat Servo skor 92 (FRESH)
- Harga normal: Rp15.000 per kg
- Talking Point: "Batch baru panen, freshness score 92, masih dalam tahap FRESH"

**Step 2: Simulasi Waktu +24 jam (Minute 1:45)**
- Action: `POST /api/demo/simulate-tick { "hours": 24 }`
- Expected: Freshness score turun karena lama disimpan
- Batch transisi ke RESCUE (skor < 70)
- Rescue Deal dibuat otomatis dengan diskon 35%
- Talking Point: "Setelah 24 jam disimpan, batch transisi ke tahap RESCUE. Sistem membuat Rescue Deal otomatis."

**Step 3: Lihat Rescue Deals (Minute 2:05)**
- Action: `GET /api/deals`
- Expected: Lihat discount 35% untuk Tomat Servo
- Early access untuk tier Silver (+2 jam)
- Harga jual: Rp9.750 per kg (dari Rp15.000)
- Talking Point: "Rescue Deal dengan diskon 35%. Pembeli Silver mendapatkan early access +2 jam."

**Step 4: Cek Tier Pembeli (Minute 2:20)**
- Action: `GET /api/tiers/me`
- Expected: Sari (b2c) adalah Silver tier
- Kuota rescue mingguan: 5 item
- Early access: +2 jam
- Talking Point: "Tier Silver: 5 kuota rescue per minggu, early access 2 jam."

**Step 5: Lihat Cascade Events (Minute 2:35)**
- Action: `GET /api/cascade`
- Expected: Riwayat transisi FRESH → RESCUE tercatotam
- Timestamp dan alasan tercatotam otomatis
- Talking Point: "Setiap transisi cascade dicatat dengan timestamp dan alasan mengapa batch beralih tahap."

**Step 6: Lanjutkan simulasi +24 jam lagi (Minute 2:50)**
- Action: `POST /api/demo/simulate-tick { "hours": 24 }` (total 48 jam dari awal)
- Expected: Rescue score turun lebih lanjut → FEED (pakan ternak)
- Feed Listing dibuat: Apel Malang per kg Rp3.000
- Rescue Deal dinonaktifkan (sudah bukan fresh lagi)
- Talking Point: "Setelah simulasi lebih lanjut, batch RESCUE lanjut ke FEED untuk pakan ternak."

**Step 7: Simulasi total +72 jam (Minute 3:10)**
- Action: Lanjutkan simulate-tick hingga total 72+ jam
- Expected: Lihat batch RESIDUE (skor < 10)
- Residue Listing: Tomat per kg Rp1.000 (kompos)
- Semua listing dinonaktifkan jika DISPOSED
- Talking Point: "Lihat seluruh cascade: FRESH → RESCUE → FEED → RESIDUE. Batch yang tidak terjual akhirnya menjadi residu."

---

### Phase 4: Business Impact & Sertifikat (Minutes 3:30 - 4:30)

**Speaker Talking Points:**
> "Setiap transaksi menyelamatkan bahan dan menciptakan dampak lingkungan. Sistem ini terbukeng mengurangi waste hingga 60% per batch."

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

### Phase 5: Loyalty Tier & Anti-Abuse (Minutes 4:30 - 5:00)

**Speaker Talking Points:**
> "Sistem tier membeli aman. Pembeli yang sengaja menunggu harga turun dihindari."

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

### Phase 6: Q&A & Backup (Minutes 5:00 - 5:30)

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
   - - Gudang: stok berkurang, reputasi baik
   - - Konsumen: harga murah, bahan segar
   - - Lingkungan: waste berkurang
3. "Skalanya berapa?"
   - → Saat ini 5 batch demo, arsitektur siap scale ke 1000+ batch dengan PostgreSQL + Prisma

---

## 🔧 Technical Notes for Judges

**API Endpoints yang Akan Dihitam:**
- `GET /api/batches` — Daftar semua batch
- `POST /api/demo/simulate-tick` — Percepat waktu simulasi
- `GET /api/deals` — Daftar Rescue Deals aktif
- `GET /api/tiers/me` — Tier dan kuota pembeli
- `GET /api/cascade` — Riwayat transisi cascade
- `GET /api/impact` — Metrik dampak ESG
- `GET /api/batch/:code` — Detail batch per-code

**Demo Accounts:**
| Role | Email | Password | Fitur |
|------|-------|----------|-------|
| Admin | admin@vesta.id | Vesta123! | Kelola tier, harga, monitoring, simulate-time |
| Producer | produsen@vesta.id | Vesta123! | Input stok, panen, harga dasar |
| Warehouse | gudang@vesta.id | Vesta123! | Cek kualitas, suhu, update status |
| Consumer | b2c@vesta.id | Vesta123! | Marketplace, Rescue Deal per tier |
| Business | b2b@vesta.id | Vesta123! | Order besar, pre-order, pakan |

**Catatan Penting:**
- Semua akun memiliki data batch yang sudah seeded dengan berbagai status cascade (FRESH → RESCUE → FEED → RESIDUE → DISPOSED)
- Simulate-time memungkinkan percepatan waktu tanpa menunggu hari-real
- Early access berdasarkan tier: Starter(0), Silver(+2), Gold(+6), Platinum(+12) jam