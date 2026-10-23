#!/bin/bash
# ============================================================
# Vesta Demo Data Seeder
# Re-seeds demo data for production/demo environments
# ============================================================

set -e

echo "🌱 Vesta Demo Data Seeder"
echo "========================="

# Check if dependencies are available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Run setup-db.sh first."
    exit 1
fi

# Run the Prisma seed script
echo "🌱 Seeding demo data..."
npx tsx src/prisma/seed.ts

echo ""
echo "✅ Demo data seeded successfully!"
echo "📊 Demo accounts login credentials:"
echo "   - Email: produsen@vesta.id, Password: Vesta123!"
echo "   - Email: gudang@vesta.id, Password: Vesta123!"
echo "   - Email: b2c@vesta.id, Password: Vesta123!"
echo "   - Email: b2b@vesta.id, Password: Vesta123!"
echo "   - Email: admin@vesta.id, Password: Vesta123!"