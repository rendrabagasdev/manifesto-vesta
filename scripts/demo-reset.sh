#!/bin/bash
# ============================================================
# Vesta Demo Reset Script
# Reset demo to initial state (re-seed database)
# ============================================================

set -e

echo "♻️ Vesta Demo Reset"
echo "==================="

# Check if dependencies are available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available."
    exit 1
fi

# Step 1: Reset database using Prisma migrate reset
# This requires knowing the last migration name
echo "🔄 Resetting database to initial state..."

# Ask for confirmation
read -p "This will DELETE all data and re-seed. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled."
    exit 1
fi

# Reset the database - this will rollback all migrations and re-apply
npx prisma migrate reset --all --confirm 2>/dev/null || \
  npx prisma migrate reset --confirm 2>/dev/null || \
  echo "⚠️ Could not auto-reset, please reset manually"

# Step 2: Re-run migrations
echo "🗄️ Running migrations..."
npx prisma migrate dev --name "init"

# Step 3: Generate Prisma client
echo "⚙️ Generating Prisma client..."
npx prisma generate

# Step 4: Re-seed demo data
echo "🌱 Re-seeding demo data..."
npx tsx src/prisma/seed.ts

echo ""
echo "✅ Demo reset complete! Database re-seeded with initial data."