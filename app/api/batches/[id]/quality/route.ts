import { NextRequest, NextResponse } from "next/server";
import { updateBatchQualityAction } from "@/app/actions/batches";
import { ApiError, handleApiError } from "@/src/lib/api/http";

/**
 * PUT /api/batches/[id]/quality
 * REST wrapper untuk updateBatchQualityAction
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batchId = parseInt(id, 10);

    if (isNaN(batchId)) {
      throw new ApiError("Batch ID tidak valid", 400, "INVALID_ID");
    }

    const body = await request.json().catch(() => {
      throw new ApiError("Body request tidak valid", 400, "INVALID_BODY");
    });

    const result = await updateBatchQualityAction(batchId, body);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          fieldErrors: result.fieldErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kualitas batch berhasil diperbarui",
      data: {
        batchId: result.batchId,
        code: result.code,
        status: result.status,
        previousStatus: result.previousStatus,
        freshnessScore: result.freshnessScore,
        previousScore: result.previousScore,
        transitioned: result.transitioned,
        forcedByTimer: result.forcedByTimer,
        availableKg: result.availableKg,
        rescueDealId: result.rescueDealId,
        reason: result.reason,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
