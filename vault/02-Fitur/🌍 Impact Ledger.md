---
tags: [fitur, impact, esg, transparansi]
---

# 🌍 Impact Ledger

## Konsep

Mencatat dan membuktikan dampak lingkungan platform secara terukur dan transparan.

## Metrik yang Dilacak

| Metrik | Sumber Data | Keterangan |
|--------|-------------|-----------|
| **kg terselamatkan** | `impact_logs` | Total berat batch yang tidak menjadi DISPOSED |
| **CO₂e dihindari** | `impact_logs` | Estimasi emisi karbon yang dihindari |
| **Air dihemat** | `impact_logs` | Estimasi konsumsi air yang dihindari |
| **Waste Diversion Rate** | `cascade_events` | % batch yang tidak DISPOSED |

## Halaman Impact (Publik)

- **Tidak memerlukan login** — bisa diakses siapa saja
- Counter dampak real-time
- Bisa di-scan via QR Code

## QR Traceability

- Setiap batch punya QR Code unik di `/trace/[batchId]`
- Menampilkan perjalanan batch: produsen → gudang → pembeli
- Dibuat dengan `qrcode.react`

## Sertifikat Dampak ESG

- PDF dibuat dengan `@react-pdf/renderer`
- Diberikan kepada mitra B2B
- Berisi ringkasan kontribusi: kg terselamatkan, CO₂e, dll.

## Price Breakdown Visualizer

- Menampilkan rincian harga: **harga petani vs margin platform**
- Membuktikan transparansi tanpa tengkulak
- Endpoint: `/products/{id}/breakdown`

> [!NOTE]
> Faktor emisi menggunakan sumber publik dan ditampilkan sebagai "estimasi" — verifikasi pihak ketiga masuk fase berikutnya.

---

## Lihat Juga
- [[🔄 Cascade State Machine]]
- [[🗄 Database Schema]] — `impact_logs`
- [[🔌 API Endpoints]] — `/impact`
- [[🏠 Home]]
