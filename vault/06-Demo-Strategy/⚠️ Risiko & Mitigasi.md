---
tags: [risiko, mitigasi]
---

# ⚠️ Risiko & Mitigasi

## Risiko Teknis

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| API eksternal (BMKG, WhatsApp, payment) gagal saat demo | 🔴 Tinggi | Mode sandbox + fallback data statis |
| Ambang tier tidak realistis | 🟡 Sedang | Kalibrasi data dummy, parameter bisa diubah admin |
| Koefisien Freshness Score tidak akurat | 🟡 Sedang | Tabel shelf life per komoditas bisa diedit, label "estimasi" |
| Faktor emisi tidak bisa dibuktikan | 🟡 Sedang | Sitasi sumber publik, tampilkan sebagai estimasi |

## Risiko Proyek

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Lingkup terlalu besar untuk waktu lomba | 🔴 Tinggi | Prioritaskan alur demo: batch → skor → rescue → tier → cascade → impact |
| Bug saat presentasi | 🔴 Tinggi | Dry-run minimal 2x, data dummy yang sudah diuji |
| Deploy gagal di hari H | 🟡 Sedang | Deploy awal di H-2, jangan tunggu H-1 |

## Non-Functional Requirements

- ✅ **Aman:** Autentikasi per peran, hak akses terpisah
- ✅ **Dapat diaudit:** Setiap perubahan harga, tier, status tercatat
- ✅ **Responsif:** Desktop dan ponsel
- ✅ **Demo stabil:** Data dummy realistis, mode simulasi, fallback API

## Metrik Keberhasilan

| Metrik | Diukur Dari |
|--------|-------------|
| Waste Diversion Rate | `impact_logs`, `cascade_events` |
| kg terselamatkan & CO₂e | `impact_logs` |
| % penjualan normal vs rescue | `orders`, `rescue_deals` |
| Waktu dari skor turun ke notifikasi | Log harga dan notifikasi |
| Kelengkapan integrasi | Checklist kriteria lomba |

---

## Lihat Juga
- [[🎭 Strategi Demo]]
- [[⏱ Timeline Sprint 8 Hari]]
- [[🏠 Home]]
