import { NextRequest, NextResponse } from "next/server";
import { runCascadeTick } from "@/src/lib/cascade/service";
import { ApiError, handleApiError, requireApiUser } from "@/src/lib/api/http";

function isSimulationEnabled(): boolean {
  return process.env.SIMULATE_TIME_ENABLED?.trim().toLowerCase() === "true";
}

export async function POST(request: NextRequest) {
  try {
    await requireApiUser(["ADMIN"]);

    if (!isSimulationEnabled()) {
      throw new ApiError(
        "Simulasi waktu dinonaktifkan pada lingkungan ini",
        403,
        "SIMULATION_DISABLED",
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawHours = body?.hours;
    const hoursToAdvance =
      typeof rawHours === "number" && Number.isFinite(rawHours)
        ? Math.max(1, Math.min(168, Math.trunc(rawHours)))
        : 24;

    const now = new Date();
    const advancedNow = new Date(
      now.getTime() + hoursToAdvance * 60 * 60 * 1000,
    );
    const tick = await runCascadeTick(advancedNow, {
      requirePriceBreakdown: true,
    });

    const transitions = tick.transitions.map((transition) => ({
      batchId: transition.batchId,
      batchCode: transition.batchCode,
      fromStatus: transition.previousStatus,
      toStatus: transition.status,
      freshnessScore: transition.freshnessScore,
    }));

    const countTransitionsTo = (status: string) =>
      tick.transitions.filter((transition) => transition.status === status)
        .length;

    const results = {
      advancedHours: hoursToAdvance,
      processedBatches: tick.processedBatches,
      statusTransitions: transitions,
      updatedPricing: tick.processedBatches,
      newRescueDeals: countTransitionsTo("RESCUE"),
      newFeedListings: countTransitionsTo("FEED"),
      newResidueListings: countTransitionsTo("RESIDUE"),
      disposedBatches: countTransitionsTo("DISPOSED"),
      loyalty: tick.loyalty,
    };

    return NextResponse.json({
      success: true,
      message: `Simulasi waktu maju ${hoursToAdvance} jam selesai`,
      data: results,
    });
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("simulate-tick error:", error);
    }
    return handleApiError(error);
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Gunakan POST untuk menjalankan simulasi waktu",
    usage: {
      method: "POST",
      body: {
        hours: 24,
      },
    },
  });
}
