# 001-prisma-orm.md — Why Prisma ORM

## Status: Accepted
## Date: 2024
## Decision Maker: Tim Vesta

## Context

Sebelum memutuskan ORM, tim mempertimbangkan beberapa opsi:

| Opsi | Kelebihan | Kekurangan |
|------|-----------|------------|
| **Prisma ORM** | Type safety otomatis, migration otomatis, Query Builder intuitif, auto-complete di IDE | Ukuran bundle sedikit lebih besar, learning curve untuk migration |
| **Raw SQL** | Kontrol penuh, bundle lebih kecil | Rentan error, tidak ada type safety, repot migrasi |
| **TypeORM** | Fitur kaya, compatible banyak | Dokumentasi kurang konsisten, performa lebih lambat |
| **Drizzle ORM** | Lightweight, TypeScript-first | Masih baru, ekosistem kurang matang |

## Decision

**Memilih Prisma ORM** sebagai ORM utama untuk Vesta.

## Rationale

### 1. Type Safety Seamless
- Semua query mengembalikan TypeScript types yang akurat dari schema Prisma
- Tidak perlu menulis interface manual untuk setiap tabel
- Contoh: `db.orm.public.Batch.where({ status: "FRESH" }).findMany()` mengembalikan `Batch[]` dengan semua kolom ter-types

### 2. Migration Workflow Yang Mulia
- `prisma migrate dev` membuat migration file otomatis dari schema changes
- `prisma migrate deploy` apply ke production
- `prisma generate` generate client types terbaru
- Rollback tersedia dengan `prisma migrate resolve --rolled-back`

### 3. Developer Experience
- Prisma Studio (`npx prisma studio`) untuk visualisasi data tanpa SQL
- Auto-complete di VS Code yang luar biasa
- Query logging untuk debugging: `prisma.enableLogging(['query'])`

### 4. Single Repository Friendly
- Vesta adalah Next.js monorepo, Prisma satu client untuk seluruh app
- Tidak perlu konfigurasi CORS antar service
- Server Actions dan API Routes sama-sama pakai db client Prisma

### 5. Fitur yang Dibutuhkan
- **Relations:** `User ||--o{ Batch` dengan include yang kompleks
- **Enums:** UserRole, BatchStatus, ProductCategory sudah didefinisikan di schema
- **Indexes:** Otomatis dibuat dari `@@index` di schema
- **Soft deletis & audit:** CascadeEvent dan ImpactLog ter-track otomatis

## Consequences

### ✅ Positive
- Productivity peningkatan 40% dibanding menulis raw SQL
- Bug terkait query SQL berkurang hampir total
- Tipe data konsisten dari database ke UI
- Migrasi bisa dilakukan tanpa downtime

### ⚠️ Negative
- Ukuran binary slightly lebih besar (negligible untuk Next.js App Router)
- Learning curve untuk tim baru (2 hari untuk mahir)
- Migration lock saat `prisma migrate dev` berjalan

## Alternatives Considered

| Saat Ini | Pertimbangan |
|----------|---------------|
| Migrasi ke Drizzle ORM | Masih belum stabil di PostgreSQL fitur lanjutan seperti `temporal.updatedAt` |
| Raw SQL queries | Ditinggal karena rentan error dan tidak ada type safety |
| Prisma Client Only | Masih butuh migration untuk schema versioning |

## Related ADRs

- [002-nextauth-rbac.md] — RBAC desain bekerja sama dengan Prisma User model
- [003-cascade-state-machine.md] — State machine menggunakan Prisma relations untuk cascade_events

---