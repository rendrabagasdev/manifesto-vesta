import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/prisma/db";
import { calculateFreshnessScore, calculateDynamicPricing, getCommodityProfile } from "@/src/lib/batches/engine";
import { BatchStatus } from "@/src/prisma/contract";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const hoursToAdvance = body.hours ?? 24;
    const now = new Date();

    // Get all batches with their product and price breakdown
    const batches = await db.orm.public.Batch
      .include("product", (product) =>
        product.select(
          "id",
          "name",
          "category",
          "shelfLifeDays",
          "idealTempC",
          "basePricePerKg",
        ),
      )
      .include("priceBreakdown")
      .include("rescueDeal")
      .include("feedListing")
      .include("residueListing")
      .all();

    const results = {
      advancedHours: hoursToAdvance,
      processedBatches: 0,
      statusTransitions: [] as Array<{
        batchId: number;
        batchCode: string;
        fromStatus: string;
        toStatus: string;
        freshnessScore: number;
      }>,
      updatedPricing: 0,
      newRescueDeals: 0,
      newFeedListings: 0,
      newResidueListings: 0,
      disposedBatches: 0,
    };

    for (const batch of batches) {
      if (!batch.product || !batch.priceBreakdown) continue;

      // Calculate new freshness score with advanced time
      const advancedNow = new Date(now.getTime() + hoursToAdvance * 60 * 60 * 1000);
      
      const freshnessResult = calculateFreshnessScore({
        harvestDate: batch.harvestDate,
        receivedAt: batch.receivedAt,
        storageTempC: batch.storageTempC,
        idealTempC: batch.product.idealTempC,
        shelfLifeDays: batch.product.shelfLifeDays,
        category: batch.product.category as any,
        now: advancedNow,
      });

      const previousStatus = batch.status;
      const newStatus = freshnessResult.status;

      // Update batch with new freshness score and status
      await db.orm.public.Batch.where({ id: batch.id }).update({
        freshnessScore: freshnessResult.score,
        status: newStatus as any,
      });

      // Calculate new dynamic pricing
      const pricing = calculateDynamicPricing({
        basePricePerKg: batch.product.basePricePerKg,
        status: newStatus,
        category: batch.product.category as any,
        warehouseCostPerKg: batch.priceBreakdown.warehouseCostPerKg,
        logisticsCostPerKg: batch.priceBreakdown.logisticsCostPerKg,
        marginPerKg: batch.priceBreakdown.marginPerKg,
      });

      // Update price breakdown
      await db.orm.public.PriceBreakdown.where({ batchId: batch.id }).update({
        rescueDiscountPct: pricing.rescueDiscountPct,
        finalPricePerKg: pricing.finalPricePerKg,
      });

      results.updatedPricing++;

      // Handle cascade transitions
      if (previousStatus !== newStatus) {
        // Create cascade event
        await db.orm.public.CascadeEvent.create({
          batchId: batch.id,
          fromStatus: previousStatus as any,
          toStatus: newStatus as any,
          freshnessScore: freshnessResult.score,
          reason: `Simulasi waktu: skor berubah dari ${previousStatus} ke ${newStatus}`,
        });

        results.statusTransitions.push({
          batchId: batch.id,
          batchCode: batch.code,
          fromStatus: previousStatus,
          toStatus: newStatus,
          freshnessScore: freshnessResult.score,
        });

        // Handle marketplace transitions based on new status
        switch (newStatus) {
          case "RESCUE": {
            // Create or update RescueDeal
            const existingDeal = batch.rescueDeal;
            const startsAt = new Date(advancedNow);
            const endsAt = new Date(startsAt.getTime() + 48 * 60 * 60 * 1000); // 48 hours
            
            if (existingDeal) {
              await db.orm.public.RescueDeal.where({ id: existingDeal.id }).update({
                discountPct: pricing.rescueDiscountPct,
                rescuePricePerKg: pricing.finalPricePerKg,
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                isActive: true,
              });
            } else {
              await db.orm.public.RescueDeal.create({
                batchId: batch.id,
                discountPct: pricing.rescueDiscountPct,
                rescuePricePerKg: pricing.finalPricePerKg,
                startsAt: startsAt.toISOString(),
                endsAt: endsAt.toISOString(),
                earlyAccessHours: 2, // Default, will be overridden by tier logic
                isActive: true,
              });
              results.newRescueDeals++;
            }
            break;
          }

          case "FEED": {
            // Deactivate rescue deal if exists
            if (batch.rescueDeal) {
              await db.orm.public.RescueDeal.where({ id: batch.rescueDeal.id }).update({
                isActive: false,
              });
            }
            // Create FeedListing
            if (!batch.feedListing) {
              await db.orm.public.FeedListing.create({
                batchId: batch.id,
                pricePerKg: Math.max(1000, Math.round(pricing.finalPricePerKg * 0.5)), // Feed price ~50% of rescue
                availableKg: batch.quantityKg - batch.reservedKg,
                suitableFor: "Ruminansia",
                description: `${batch.product.name} layak pakan dengan kadar air terkontrol.`,
                isActive: true,
              });
              results.newFeedListings++;
            }
            break;
          }

          case "RESIDUE": {
            // Deactivate feed listing if exists
            if (batch.feedListing) {
              await db.orm.public.FeedListing.where({ id: batch.feedListing.id }).update({
                isActive: false,
              });
            }
            // Create ResidueListing
            if (!batch.residueListing) {
              await db.orm.public.ResidueListing.create({
                batchId: batch.id,
                pricePerKg: Math.max(500, Math.round(pricing.finalPricePerKg * 0.2)), // Residue price ~20% of rescue
                availableKg: batch.quantityKg - batch.reservedKg,
                processingType: "Kompos",
                description: `Residu ${batch.product.name} untuk bahan kompos organik.`,
                isActive: true,
              });
              results.newResidueListings++;
            }
            break;
          }

          case "DISPOSED": {
            // Deactivate all listings
            if (batch.rescueDeal) {
              await db.orm.public.RescueDeal.where({ id: batch.rescueDeal.id }).update({
                isActive: false,
              });
            }
            if (batch.feedListing) {
              await db.orm.public.FeedListing.where({ id: batch.feedListing.id }).update({
                isActive: false,
              });
            }
            if (batch.residueListing) {
              await db.orm.public.ResidueListing.where({ id: batch.residueListing.id }).update({
                isActive: false,
              });
            }
            results.disposedBatches++;
            break;
          }
        }
      }

      results.processedBatches++;
    }

    // Also advance time for any time-based logic (e.g., rescue deal timers)
    // This could be extended to handle early access timers, etc.

    return NextResponse.json({
      success: true,
      message: `Simulasi waktu maju ${hoursToAdvance} jam selesai`,
      data: results,
    });
  } catch (error) {
    console.error("simulate-tick error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menjalankan simulasi waktu" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Gunakan POST untuk menjalankan simulasi waktu",
    usage: {
      method: "POST",
      body: {
        hours: 24, // optional, default 24
      },
    },
  });
}