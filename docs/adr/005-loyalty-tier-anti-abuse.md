# 005-loyalty-tier-anti-abuse.md — Loyalty Tier Anti-Abuse

## Status: Accepted
## Date: 2024
## Decision Maker: Tim Vesta

## Context

Sistem Loyalty Tier di Vesta hadir untuk mencegah **strategic waiting** — pembeli yang sengaja menunggu barang hampir expired demi harga murah, sehingga merugikan penjualan harga normal.

## Decision

**Mendesain sistem tier berdasarkan total belanja harga normal 30 hari terakhir, dengan kuota rescue dan early access yang terbatas per minggu.**

## Rationale

### 1. Masalah yang Dipecahkan

**Strategic Waiting:** Jika hanya ada discount rescue, pembeli akan:
- Menghindari pembelian harga normal
- Menunggu batch turun ke RESCUE tier
- Membeli hanya saat diskon maksimal (60%)

**Konsekuensi:** Penjualan harga normal collapse, penjualan tidak stabil.

### 2. Desain Anti-Abuse Rules

**Rule 1: Kuota Rescue Bukan Stackable**
- Setiap minggu, kuota direset ke nol
- Tidak bisa menumpuk dari minggu sebelumnya
- `rescue_quota_usage` table tracking per `[userId, weekStart]`

**Rule 2: Poin Hanya dari Pembelian Harga Normal**
- `LoyaltyLedger.type = EARN` hanya untuk order dengan status PAID
- Order item dengan stage RESCUE tidak memberikan poin
- `pointsDelta` hanya bertambah dari `subtotal` harga normal

**Rule 3: Early Access Timer Strict**
- `earlyAccessHours` di `buyer_tiers` tabel
- Hanya bisa diakses jika `hoursSinceDealStart >= earlyAccessHours`
- Hitung dari `deal.startsAt`, bukan dari waktu sekarang secara bebas
- Contoh: Gold tier punya +6 jam early access, tapi harus menunggu deal mulai

**Rule 4: Tier Based on 30-Day Rolling Total**
- `totalSpend30d` dihitung rolling window 30 hari
- Bukan total lifetime spending
- Reset otomatis setiap 30 hari dari first purchase user

### 3. Flowchart Anti-Abuse

```mermaid
flowchart TD
    A["Pembeli belanja harga normal"] --> B["Poin terkumpul di LoyaltyLedger"]
    B --> C{"Total 30 hari?"}
    C -->|"< 500rb"| D["Starter: 2 rescue/minggu, no early access"]
    C -->|"≥ 500rb"| E["Silver: 5 rescue/minggu, +2 jam"]
    C -->|"≥ 2jt"| F["Gold: 12 rescue/minggu, +6 jam"]
    C -->|"≥ 5jt"| G["Platinum: 25 rescue/minggu, +12 jam"]
    
    style D fill:#ffd9d9,stroke:#f52e2e
    style E fill:#fff5cc,stroke:#eab308
    style F fill:#c6ffcc,stroke:#2f855a
    style G fill:#e0e7ff,rgba(59,130,246,0.2)
```

### 4. Database Tracking

Tabel-tabel yang terlibat:

| Tabel | Fungsi Anti-Abuse |
|-------|-------------------|
| `buyer_tiers` | Status tier saat ini, kuota, early access hours |
| `buyer_loyalty_ledger` | Riwayat EARN/REDEEM/ADJUST per order |
| `rescue_quota_usage` | Tracking kuota yang terpakai per minggu |
| `orders` | Filter: hanya order dengan status PAID yang dihitung poin |

**Query untuk cek tier:**
```sql
SELECT * FROM buyer_tiers 
WHERE userId = 1 
ORDER BY createdAt DESC 
LIMIT 1;
```

**Query untuk cek quota usage minggu ini:**
```sql
SELECT * FROM rescue_quota_usage 
WHERE userId = 1 
AND weekStart = '2024-01-15'; -- Minggu ini
```

### 5. Contoh Skenario Anti-Abuse

**Skenario A: Pembeli "Sengaja Menunggu"**
1. Minggu 1: Belanja Rp200.000 harga normal → poin sedikit, tier Starter
2. Minggu 2: Belanja Rp300.000 harga normal → total 30 hari: Rp500.000 → naik ke Silver
3. Minggu 3: Belanja Rp0 harga normal, hanya rescue discount → total 30 hari masih Rp500.000 (window bergeser)
4. **Hasil:** Tier tetap Silver, tapi kuota rescue mingguan sudah direset minggu sebelumnya, jadi harus mulai dari nol lagi.

**Skenario B: Pembeli Reguler**
1. Setiap minggu belanja Rp500.000 harga normal
2. Setiap minggu dapat kuota rescue 5 item (Silver tier)
3. Poin terus terkumpul, tier naik ke Gold setelah 4 minggu
4. **Hasil:** Manfaat bertahap, tidak bisa "main-main" dengan menunggu.

### 6. Prevention of Edge Cases

| Edge Case | Prevention |
|-----------|------------|
| User belanja semua di hari terakhir 30 hari | Rolling window, tidak bisa "cheat" di akhir periode |
| User belanja rescue dan kira tier naik | Hanya belanja harga normal (PAID status) yang dihitung |
| User pakai kuota rescue minggu lalu di minggu ini | `weekStart` tracking, kuota tidak stackable |
| Admin manual adjust poin | `LedgerType ADJUST` hanya bisa admin via dashboard, terlog di audit |

### 7. Keamanan & Monitoring

- **Alert jika:** `totalSpend30d` tiba-tiba loncat drastis (mungkin fraud)
- **Audit log:** Setiap `ADJUST` di `loyalty_ledger` butuh alasan dan actor
- **Rate limit:** Kuota rescue per user per week hard limit di database

## Consequences

### ✅ Positive
- Mencegah strategic waiting yang merugikan penjual
- Sistem yang adil: imbalan (kuota + early access) sesuai investasi (belanja harga normal)
- Terstruktur: rolling 30 hari yang jelas, bukan total lifetime
- Monitorable: semua aktivitas tercatat di loyalty_ledger dan rescue_quota_usage

### ⚠️ Negative
- Butuh edukasi user tentang cara kerja tier
- Rolling window butuh perhitungan yang tepat di setiap request
- Jika user hanya belanja sekali 30 hari, tier naik tapi kuota tetap rendah

## Related ADRs

- [001-prisma-orm.md] — Tier data disimpan di `buyer_tiers` Prisma model
- [002-nextauth-rbac.md] — Setiap user punya tier dan kuota yang terbatas
- [003-cascade-state-machine.md] — Anti-abuse bekerja dengan timing cascade transisi
- [004-freshness-score-algorithm.md] — Harga berdasarkan skor mempengaruhi keputusan pembeli
- [02-Fitur/🏅 Loyalty Tier System.md] — Sumber referensi asli dari vault

---