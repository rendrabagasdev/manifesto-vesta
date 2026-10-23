#!/bin/bash
# ============================================================
# Vesta Database Setup Script
# Initialize database, run migrations, and seed demo data
# ============================================================

set -e

echo "📦 Vesta Database Setup"
echo "========================"

# Check if dependencies are available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available."
    exit 1
fi

# Step 1: Install dependencies
echo "📥 Installing dependencies..."
npm install

# Step 2: Generate Prisma client
echo "⚙️ Generating Prisma client..."
npx prisma generate

# Step 3: Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate dev --name "init"

# Step 4: Deploy migrations (for production/neon)
echo "🚀 Deploying migrations to database..."
npx prisma migrate deploy

# Step 5: Seed demo data
echo "🌱 Seeding demo data..."
npx tsx src/prisma/seed.ts

echo ""
echo "✅ Database setup complete!"
echo "📊 Demo accounts created:"
echo "   - Admin: admin@vesta.id / Vesta123!"
echo "   - Producer: produsen@vesta.id / Vesta123!"
echo "   - Warehouse: gudang@vesta.id / Vesta123!"
echo "   - Consumer: b2c@vesta.id / Vesta123!"
echo "   - Business: b2b@vesta.id / Vesta123!"