# Vesta — Freshness Cascade Platform

Marketplace bahan pokok segar yang menghubungkan produsen → gudang → konsumen tanpa tengkulak dengan sistem cascade 5 tahap (*FRESH → RESCUE → FEED → RESIDUE → DISPOSED*).

---

## 🐳 Menjalankan dengan Docker

Pastikan Docker & Docker Compose sudah terpasang.

### 1. Siapkan Environment Variables
```bash
cp .env.example .env
```

### 2. Jalankan Container (Next.js + PostgreSQL)
```bash
docker compose up --build -d
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **PostgreSQL Database**: `localhost:5432`
  - User: `postgres`
  - Password: `postgres`
  - Database: `vesta`

### 3. Menghentikan Container
```bash
docker compose down
```
*(Tambahkan `-v` jika ingin menghapus volume database: `docker compose down -v`)*

---

## 💻 Menjalankan secara Lokal (Tanpa Docker)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
