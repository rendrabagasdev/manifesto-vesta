# 🌱 Vesta Environment Setup Guide
# Complete documentation for all environment variables and setup steps

## 📋 Overview
This guide documents all environment variables required for the Vesta Freshness Cascade Platform.
Variables are categorized as **Required** (must be set) or **Optional** (can use defaults).

---

## 🗄️ Database Variables

### `DATABASE_URL` (Required)
- **Description:** PostgreSQL connection string for Supabase or Neon
- **Format:** `postgresql://user:password@host:port/database?schema=public`
- **Example:** `postgresql://postgres:postgres@db.your-project.supabase.co:5432/postgres?schema=public`
- **Notes:** 
  - Required for all environments
  - Supabase format: `postgresql://postgres:password@db.<project>.supabase.co:5432/postgres`
  - Neon format: `postgresql://ep:<port>.us-east-2.aws.neon.tech/dbname`
  - Must have `schema=public` appended or configured in prisma schema

---

## 🔐 Authentication Variables

### `NEXTAUTH_SECRET` (Required)
- **Description:** Secret key for NextAuth.js session encryption
- **Format:** Random string minimum 32 characters
- **Example:** `openssl rand -hex 32`
- **Notes:** 
  - Generate with: `openssl rand -hex 32`
  - Must be kept secret - do not share in public repos
  - Used for signing JWT sessions and cookies

### `NEXTAUTH_URL` (Required)
- **Description:** Base URL for the application, used for callback URLs
- **Format:** `http://localhost:3000` or `https://your-domain.vercel.app`
- **Example:** `https://vesta.vercel.app`
- **Notes:** 
  - Must match the Vercel deployment URL in production
  - For local development, use `http://localhost:3000`
  - Cannot be `null` in production

---

## 💜 Supabase Variables (Optional)

### `NEXT_PUBLIC_SUPABASE_URL` (Optional)
- **Description:** Supabase project URL for auth and realtime features
- **Format:** `https://<project-id>.supabase.co`
- **Example:** `https://abc123.supabase.co`
- **Notes:** 
  - Obtain from Supabase Dashboard → Settings → API
  - Required if using Supabase Auth or realtime subscriptions
  - Can be omitted if using only PostgreSQL directly via DATABASE_URL

### `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Optional)
- **Description:** Supabase anonymous/public API key
- **Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoi...`
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- **Notes:** 
  - Obtain from Supabase Dashboard → Settings → API → anon public
  - Keep this key - it's not a secret but should be restricted in Supabase

---

## 💳 Payment Variables

### `MIDTRANS_SERVER_KEY` (Required)
- **Description:** Midtrans server key for Sandbox environment
- **Format:** `SERVER-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Example:** `SERVER-pHg0yIlxGKT7s1PX`
- **Notes:** 
  - Register at midtrans.com and create a Sandbox account
  - Required for processing payments in demo/competition
  - Do not confuse with client key (different purpose)

### `MIDTRANS_CLIENT_KEY` (Required)
- **Description:** Midtrans client key for Sandbox environment
- **Format:** `KEY-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Example:** `KEY-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Notes:** 
  - Used for frontend payment integration
  - Different from server key - server key handles server-side verification

---

## 💬 WhatsApp Variables

### `FONNTE_API_TOKEN` (Required)
- **Description:** Fonnte API token for WhatsApp Sandbox notifications
- **Format:** `your-fonnte-api-token-here`
- **Example:** `1234567890-abcdefgh`
- **Notes:** 
  - Register at fonnte.com and set up WhatsApp Sandbox
  - Used for order notifications, cascade alerts, and ESG certificates
  - Required if WhatsApp notification features are enabled

---

## 🎮 Demo Control Variables

### `SIMULATE_TIME_ENABLED` (Required for Demo)
- **Description:** Enable/disable time simulation for competition demo
- **Format:** `true` or `false`
- **Default:** `true`
- **Notes:** 
  - Set to `true` for UNIC competition demo
  - Allows judges to see cascade transitions in seconds/minutes instead of days
  - Set to `false` for production with real-time tracking
  - When `true`, `POST /api/demo/simulate-tick` endpoint is active

### `MAINTENANCE_MODE` (Optional)
- **Description:** Enable maintenance mode redirect
- **Format:** `true` or `false`
- **Default:** `false`
- **Notes:** 
  - When `true`, redirects all non-admin users to maintenance page
  - `MAINTENANCE_BYPASS_KEY` allows specific users to bypass
  - Useful for scheduled maintenance or deployment

### `MAINTENANCE_BYPASS_KEY` (Optional)
- **Description:** Bypass key for maintenance mode
- **Format:** Any string (default: `vesta2026`)
- **Example:** `vesta2026`
- **Notes:** 
  - Append `?bypass=key` to URL to bypass maintenance mode
  - Only works when `MAINTENANCE_MODE=true`

---

## 📦 Complete `.env.example` Reference

```env
# Database (Required)
DATABASE_URL="postgresql://postgres:postgres@db.your-project.supabase.co:5432/postgres?schema=public"

# Auth (Required)
NEXTAUTH_SECRET="openssl-rand-hex-32-chars"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Supabase (Optional)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Payment Sandbox (Required for Demo)
MIDTRANS_SERVER_KEY="SERVER-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MIDTRANS_CLIENT_KEY="KEY-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# WhatsApp Sandbox (Required for Notifications)
FONNTE_API_TOKEN="your-fonnte-api-token-here"

# Demo Controls (Required for Competition)
SIMULATE_TIME_ENABLED="true"

# Maintenance Mode (Optional)
MAINTENANCE_MODE="false"
MAINTENANCE_BYPASS_KEY="vesta2026"
```

---

## ⚠️ Important Notes

### Required vs Optional Summary

| Variable | Category | Notes |
|----------|----------|-------|
| `DATABASE_URL` | **Required** | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | **Required** | 32+ char random string |
| `NEXTAUTH_URL` | **Required** | Must match Vercel domain |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase auth/realtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key |
| `MIDTRANS_SERVER_KEY` | **Required** | Sandbox server key |
| `MIDTRANS_CLIENT_KEY` | **Required** | Sandbox client key |
| `FONNTE_API_TOKEN` | **Required** | Fonnte WhatsApp token |
| `SIMULATE_TIME_ENABLED` | **Required (Demo)** | Must be `true` for competition |
| `MAINTENANCE_MODE` | Optional | Default: `false` |
| `MAINTENANCE_BYPASS_KEY` | Optional | Default: `vesta2026` |

### Setup Checklist

#### Local Development
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in `DATABASE_URL` with valid PostgreSQL connection
- [ ] Generate `NEXTAUTH_SECRET` (32+ chars): `openssl rand -hex 32`
- [ ] Set `NEXTAUTH_URL` to `http://localhost:3000`
- [ ] Add Midtrans Sandbox keys (required for demo features)
- [ ] Add Fonnte API token (required for notifications)
- [ ] Set `SIMULATE_TIME_ENABLED="true"` for competition demo
- [ ] Run `npm install` and `npx prisma generate`
- [ ] Run `npx prisma migrate dev --name "init"`
- [ ] Run `npx tsx src/prisma/seed.ts`

#### Vercel Deployment
- [ ] All environment variables added in Vercel Dashboard → Settings → Environment Variables
- [ ] `NEXTAUTH_URL` set to `https://<your-app>.vercel.app`
- [ ] `SIMULATE_TIME_ENABLED="true"` enabled for demo
- [ ] `DATABASE_URL` points to production database
- [ ] Run `npx prisma generate` after deploying
- [ ] Run `npx prisma migrate deploy` if new migrations

#### Production Checklist
- [ ] All required variables populated (see table above)
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] Database migrations deployed (`npx prisma migrate deploy`)
- [ ] Demo data seeded (`npx tsx src/prisma/seed.ts`)
- [ ] `SIMULATE_TIME_ENABLED="true"` for competition mode
- [ ] Midtrans/Fonnte sandbox credentials tested
- [ ] CORS configured for production origin
- [ ] HTTPS enforced (Next.js automatic with Vercel)