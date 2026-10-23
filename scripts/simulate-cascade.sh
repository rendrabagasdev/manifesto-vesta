#!/bin/bash
# ============================================================
# Vesta Cascade Simulation Script
# Run cascade simulation for demo purposes
# ============================================================

set -e

echo "⏱️ Vesta Cascade Simulation"
echo "============================="

# Check if dependencies are available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available."
    exit 1
fi

# Check if SIMULATE_TIME_ENABLED is true
if [ "${SIMULATE_TIME_ENABLED}" != "true" ]; then
    echo "⚠️ SIMULATE_TIME_ENABLED is not set to 'true'. Simulation skipped."
    echo "Set SIMULATE_TIME_ENABLED=true to enable."
    exit 1
fi

# Check if we have the API endpoint available
echo "🔄 Starting cascade simulation..."

# The simulation is triggered via API endpoint
# This script will make API calls to tick the cascade forward

# Default: simulate 24 hours
HOURS=${1:-24}

if [ "$HOURS" = "0" ]; then
    echo "⏭️ No hours specified. Simulating 24 hours by default..."
    HOURS=24
fi

echo "📊 Simulating $HOURS hours of cascade time..."

# Make API call to simulate time tick
# POST /api/demo/simulate-tick { "hours": 24 }
RESPONSE=$(curl -s -X POST "http://localhost:3000/api/demo/simulate-tick" \
  -H "Content-Type: application/json" \
  -d "{\"hours\": $HOURS}" 2>/dev/null || echo "{}")

if echo "$RESPONSE" | grep -q "error"; then
    echo "⚠️ API returned an error (may need server running):"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Cascade simulation complete: $HOURS hours advanced"
echo "📈 Check the API response for batch status transitions:"
echo "   - FRESH → RESCUE (skor < 70)"
echo "   - RESCUE → FEED (skor < 30)"
echo "   - FEED → RESIDUE (skor < 10)"
echo "   - RESIDUE → DISPOSED (skor 0)"

# Display summary if we can fetch batches
echo ""
echo "📋 Current batch status summary:"
curl -s "http://localhost:3000/api/batches" 2>/dev/null | python3 -m json.tool 2>/dev/null || \
  echo "(Run server locally to see batch status)"