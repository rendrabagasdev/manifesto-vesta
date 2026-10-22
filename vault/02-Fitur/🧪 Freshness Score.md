---
tags: [fitur, freshness, algoritma]
---

# 🧪 Freshness Score

## Konsep

Setiap batch memiliki skor **0-100** yang menjadi dasar:
- **Harga** (semakin rendah skor → semakin besar diskon)
- **Prioritas penjualan**
- **Transisi cascade** (threshold trigger)

## Rumus

$$F = 100 \times \max\left(0,\ 1 - \frac{t_{\text{simpan}} \cdot k_{\text{suhu}} + t_{\text{kirim}}}{S_{\text{komoditas}}}\right)$$

### Variabel

| Simbol | Keterangan |
|--------|-----------|
| $t_{\text{simpan}}$ | Hari sejak panen |
| $k_{\text{suhu}}$ | Pengali kerusakan bila suhu gudang di atas ideal (1.0 bila ideal) |
| $t_{\text{kirim}}$ | Lama pengiriman dalam hari |
| $S_{\text{komoditas}}$ | Shelf life komoditas dalam hari |

## Mekanika

- Dihitung ulang **otomatis per jam** oleh scheduler
- Dihitung ulang **saat gudang memperbarui data suhu**
- Gudang dapat **mengoreksi manual** bila hasil inspeksi fisik berbeda (misal: batch masih bagus meski skor rendah)
- Koefisien per komoditas bisa diedit admin — diberi label "estimasi"

> [!IMPORTANT]
> **MVP: Data suhu menggunakan dummy data** — input manual oleh operator gudang atau di-seed otomatis. Integrasi sensor suhu IoT nyata adalah fitur mendatang (post-competition).

## Threshold & Transisi

| Skor | Status | Aksi |
|------|--------|------|
| 100-70 | 🟢 FRESH | Dijual harga normal |
| 69-30 | 🟡 RESCUE | Masuk [[💰 Dynamic Rescue Pricing]] |
| 29-10 | 🟠 FEED | Pindah ke [[🔄 Cascade State Machine]] tahap pakan |
| 9-1 | 🔴 RESIDUE | Pindah ke tahap residue (pupuk/biogas) |
| 0 | ⚫ DISPOSED | Tercatat sebagai waste |

> [!NOTE]
> Threshold ini adalah default. Admin dapat mengubahnya via dashboard.

---

## Lihat Juga
- [[💰 Dynamic Rescue Pricing]]
- [[🔄 Cascade State Machine]]
- [[🗄 Database Schema]] — tabel `batches`
- [[🏠 Home]]
