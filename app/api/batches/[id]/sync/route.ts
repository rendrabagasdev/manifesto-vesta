import { NextRequest, NextResponse } from "next/server";
import { syncBatchStateAction } from "@/app/actions/batches";
import { ApiError, handleApiError } from "@/src/lib/api/http";

/**
 * POST /api/batches/[id]/sync
 * REST wrapper untuk syncBatchStateAction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batchId = parseInt(id, 10);

    if (isNaN(batchId)) {
      throw new ApiError("Batch ID tidak valid", 400, "INVALID_ID");
    }

    const result = await syncBatchStateAction(batchId);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Batch berhasil disinkronkan",
      data: {
        batchId: result.batchId,
        code: result.code,
        status: result.status,
        previousStatus: result.previousStatus,
        transitioned: result.transitioned,
        freshnessScore: result.freshnessScore,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
