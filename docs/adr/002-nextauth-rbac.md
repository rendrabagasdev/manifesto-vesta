# 002-nextauth-rbac.md — Role-based Auth Design

## Status: Accepted
## Date: 2024
## Decision Maker: Tim Vesta

## Context

Vesta memerlukan sistem otorisasi yang ketat dengan 5 peran pengguna (RBAC). Setiap peran memiliki akses yang berbeda ke fitur dan data.

## Decision

**Menggunakan NextAuth.js v5 dengan RBAC berbasis role di middleware.**

## Rationale

### 1. Arsitektur RBAC yang Jelas

5 peran terdefinisi dengan akses spesifik:

| Peran | Akses Utama |
|-------|-------------|
| **ADMIN** | Penuh: semua endpoint, manage tier, monitoring, simulate-time |
| **PRODUCER** | Input stok, harga dasar, pantau pembayaran |
| **WAREHOUSE** | Cek kualitas, catat suhu, update status batch |
| **CONSUMer** | Marketplace normal, Rescue Deal sesuai tier |
| **BUSINESS** | Order besar, pre-order, pakan, residu, sertifikat dampak |

### 2. NextAuth.js v5 Integration

- Menggunakan `requireSession()` di setiap API route
- Role check di middleware untuk protection granular
- Session dienkripsi di `NEXTAUTH_SECRET`

**Contoh Middleware:**
```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const { token } = req.auth;
    const { pathname } = req.nextUrl;

    // ADMIN only routes
    if (pathname.startsWith("/api/admin") && token.role !== "ADMIN") {
      return new Response("Forbidden", { status: 403 });
    }

    // PRODUCER only routes
    if (pathname.startsWith("/api/producer") && token.role !== "PRODUCER") {
      return new Response("Forbidden", { status: 403 });
    }
  },
  {
    callbacks: {
      async session({ session, token }) {
        token.role = session.user.role;
        return session;
      },
    },
  }
);
```

### 3. Session & Token Management

- **Access Token:** 1 jam (default NextAuth)
- **Refresh Token:** Otomatis via refresh token flow
- **Role di Session:** Disimpan di `session.user.role` setelah login

### 4. Database Integration dengan Prisma

Schema Prisma sudah mendefinisikan role:

```prisma
enum UserRole {
  ADMIN    = "ADMIN"
  PRODUCER = "PRODUCER"
  WAREHOUSE = "WAREHOUSE"
  CONSUMER = "CONSUMER"
  BUSINESS = "BUSINESS"
}
```

Setelah user login, role disimpan di:
- `users` table kolom `role`
- `session.user.role` via NextAuth callbacks
- `db.orm.public.User.where({ role: "ADMIN" })` untuk query

### 5. Anti-Abuse & Security

- Setiap endpoint validasi role di server-side (bukan hanya client-side)
- Rate limit per role (ADMIN lebih ketat)
- Audit log via `cascade_events` untuk tracking aktivitas per role

## Consequences

### ✅ Positive
- Otorisasi yang konsisten di seluruh aplikasi
- Mudah menambah peran baru (hanya enum + middleware update)
- Audit trail otomatis untuk compliance
- User experience yang mulus (tidak ada redirect login yang mengejutkan)

### ⚠️ Negative
- Membutuhkan konfigurasi middleware untuk setiap route baru
- Role harus konsisten antara NextAuth schema dan Prisma schema
- Jika role diubah di database, perlu restart session

## Alternatives Considered

| Opsi | Alasan Ditinggal |
|------|-----------------|
| **Clerk Auth** | Terlalu mahal untuk proyek lomba, fitur overkill |
| **Supabase Auth** | Sudah pakai NextAuth, duplikasi |
| **Custom JWT** | More work, less secure than established library |
| **NextAuth v4** | v5 memiliki API yang lebih baru dan session management yang lebih baik |

## Related ADRs

- [001-prisma-orm.md] — Prisma menyimpan role enum, NextAuth membacanya
- [003-cascade-state-machine.md] — Setiap transisi cascade perlu actor (role) yang tercatat
- [005-loyalty-tier-anti-abuse.md] — Anti-abuse rules mengandalkan RBAC untuk kuota rescue

---