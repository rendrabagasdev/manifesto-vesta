import { NextRequest, NextResponse } from "next/server";
import { createBatchAction } from "@/app/actions/batches";
import { ApiError, handleApiError } from "@/src/lib/api/http";

/**
 * POST /api/batches
 * REST wrapper untuk createBatchAction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new ApiError("Body request tidak valid", 400, "INVALID_BODY");
    });

    const result = await createBatchAction(body);

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
      message: "Batch berhasil dibuat",
      data: {
        id: result.id,
        batchId: result.batchId,
        code: result.code,
        status: result.status,
        freshnessScore: result.freshnessScore,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
