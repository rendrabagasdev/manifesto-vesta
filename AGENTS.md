<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Freshness Cascade Platform (Vesta)

## Protected CI/CD Workflows

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) is finalized and protected. Do not modify, remove, or reintroduce production build/deploy steps there unless the user explicitly requests a CI/CD architecture change.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) is the only workflow responsible for building the production Docker image and deploying it.
- Do not duplicate `npm run build`, Docker build, image push, or deployment steps in `ci.yml`.

## Tentang Proyek

**Vesta** (Freshness Cascade Platform) adalah marketplace bahan pokok segar yang menghubungkan produsen → gudang → konsumen tanpa tengkulak. Stok mendekati kedaluwarsa diselamatkan lewat harga dinamis dan sistem cascade 5 tahap (FRESH → RESCUE → FEED → RESIDUE → DISPOSED).

Dibangun untuk **Lomba Web Development UNIC** — tema Ekosistem Digital / Food Waste.

---

## Tech Stack

| Layer      | Teknologi                                  |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 16 (App Router)                    |
| Language   | TypeScript (strict)                        |
| UI         | Tailwind CSS v4 + shadcn/ui                |
| Database   | PostgreSQL (Supabase / Neon)               |
| ORM        | Prisma                                     |
| Auth       | Supabase Auth / NextAuth.js (RBAC 5 peran) |
| PDF        | @react-pdf/renderer                        |
| QR Code    | qrcode.react                               |
| Payment    | Midtrans Sandbox                           |
| Notifikasi | VPS SElfhosted                             |

---

## Struktur Direktori

```
vesta/
├── app/                    # Next.js App Router (pages, layouts, routes)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/                # API Route Handlers (akan dibuat)
│       └── demo/
│           └── simulate-tick/  # Percepat waktu simulasi untuk demo
├── prisma/                 # Prisma schema & migrations (akan dibuat)
├── vault/                  # Obsidian Knowledge Base (JANGAN diedit oleh agent)
├── AGENTS.md               # File ini
├── package.json
├── tsconfig.json
└── .git/
    └── hooks/
        └── pre-push        # Blokir push ke main/master
```

---

## Aturan & Konvensi

### Git

- **DILARANG** push langsung ke branch `main` atau `master`. Gunakan feature branch + Pull Request.
- Format branch: `feat/nama-fitur`, `fix/nama-bug`, `chore/deskripsi`
- Commit message: gunakan [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

### Kode

- Semua kode ditulis dalam **TypeScript** — jangan gunakan `any` kecuali benar-benar diperlukan.
- Gunakan **Server Components** secara default. Tambahkan `"use client"` hanya jika komponen butuh interaktivitas browser.
- Gunakan **Server Actions** untuk mutasi data, bukan API routes (kecuali untuk endpoint publik / webhook).
- Styling menggunakan **Tailwind CSS** — jangan buat file CSS terpisah kecuali untuk konfigurasi global.
- **Jangan hardcode warna** di komponen. Semua warna memakai token semantik di `app/globals.css` (mis. `bg-surface`, `text-ink`, `bg-brand`); ikuti arahan skill `design-taste-frontend`.
- Komponen UI menggunakan **shadcn/ui** — jangan buat komponen kustom untuk hal yang sudah tersedia di shadcn.

### Database & ORM

- Semua akses database melalui **Prisma ORM** — jangan tulis raw SQL kecuali untuk query yang sangat kompleks.
- Skema database didefinisikan di `prisma/schema.prisma`.
- Setelah mengubah schema, jalankan `npx prisma migrate dev`.

### Penamaan

- File & folder: `kebab-case` (contoh: `rescue-deal.tsx`, `buyer-tier.ts`)
- Komponen React: `PascalCase` (contoh: `FreshnessScore`, `RescueDeal`)
- Fungsi & variabel: `camelCase` (contoh: `calculateFreshness`, `rescuePrice`)
- Tabel database: `snake_case` (contoh: `cascade_events`, `buyer_tiers`)
- Konstanta: `UPPER_SNAKE_CASE` (contoh: `MAX_RESCUE_DISCOUNT`, `TIER_THRESHOLDS`)

### API Routes

- Letakkan di `app/api/[domain]/route.ts`
- Selalu validasi input dengan **Zod**
- Selalu return JSON yang konsisten: `{ data, error, message }`

---

## 5 Peran Pengguna (RBAC)

| Role        | Akses                                                     |
| ----------- | --------------------------------------------------------- |
| `ADMIN`     | Kelola tier, harga dasar, monitoring cascade, konfigurasi |
| `PRODUCER`  | Input stok, tanggal panen, harga dasar, pantau pembayaran |
| `WAREHOUSE` | Cek kualitas, catat suhu, update status batch             |
| `CONSUMER`  | Marketplace normal, Rescue Deal sesuai tier               |
| `BUSINESS`  | Order besar, pre-order, pakan, residu, sertifikat dampak  |

---

## Fitur Inti — Referensi Cepat

### Freshness Score

Skor 0-100 per batch. Rumus:

```
F = 100 × max(0, 1 - (t_simpan × k_suhu + t_kirim) / S_komoditas)
```

- Data suhu saat ini menggunakan **dummy data / input manual** (bukan IoT sensor — itu fitur mendatang)
- Dihitung ulang per jam oleh scheduler dan saat data suhu diperbarui

### Cascade State Machine

```
FRESH (skor ≥70) → RESCUE (skor <70) → FEED (skor <30) → RESIDUE (skor <10) → DISPOSED (skor 0)
```

### Loyalty Tier

| Tier     | Belanja Normal 30 Hari | Kuota Rescue/Minggu | Early Access |
| -------- | ---------------------- | ------------------- | ------------ |
| Starter  | < 500rb                | 2                   | —            |
| Silver   | ≥ 500rb                | 5                   | +2 jam       |
| Gold     | ≥ 2jt                  | 12                  | +6 jam       |
| Platinum | ≥ 5jt                  | 25                  | +12 jam      |

---

## Hal yang TIDAK Boleh Dilakukan

- ❌ Jangan push langsung ke `main` / `master`
- ❌ Jangan pakai `any` type di TypeScript
- ❌ Jangan buat komponen client tanpa alasan — default ke Server Component
- ❌ Jangan hardcode kredensial — gunakan environment variables
- ❌ Jangan implementasi integrasi IoT sensor — itu fitur mendatang, gunakan dummy data

---

## Environment Variables (Template)

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Supabase (opsional)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Payment (Sandbox)
MIDTRANS_SERVER_KEY="..."
MIDTRANS_CLIENT_KEY="..."

# WhatsApp (Sandbox)
FONNTE_API_TOKEN="..."

# Demo
SIMULATE_TIME_ENABLED="true"
```

---

## Dokumentasi Tambahan

- PRD lengkap: `PRD Freshness Cascade Platform.pdf`
- Tech stack & timeline: `tech_stack_recommendation_unic_competition.md`
- Knowledge base: `vault/` (buka dengan Obsidian)
- Knowledge prisma: `prisma-8.md`
