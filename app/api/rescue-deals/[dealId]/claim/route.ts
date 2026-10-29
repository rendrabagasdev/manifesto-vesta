import { NextRequest, NextResponse } from "next/server";
import { claimRescueDealAction } from "@/app/actions/orders";
import { ApiError, handleApiError } from "@/src/lib/api/http";

/**
 * POST /api/rescue-deals/[dealId]/claim
 * REST wrapper untuk claimRescueDealAction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const id = parseInt(dealId, 10);

    if (isNaN(id)) {
      throw new ApiError("Deal ID tidak valid", 400, "INVALID_ID");
    }

    const body = await request.json().catch(() => {
      throw new ApiError("Body request tidak valid", 400, "INVALID_BODY");
    });

    const { quantityKg } = body;

    if (quantityKg === undefined) {
      throw new ApiError(
        "Field quantityKg wajib diisi",
        400,
        "MISSING_QUANTITY"
      );
    }

    const result = await claimRescueDealAction(id, quantityKg);

    if (!result.ok) {
      const statusCode =
        result.errorCode === "RESCUE_QUOTA_EXHAUSTED" ||
        result.errorCode === "EARLY_ACCESS_LOCKED" ||
        result.errorCode === "EXPIRED" ||
        result.errorCode === "DEAL_INACTIVE"
          ? 403
          : result.errorCode === "DEAL_NOT_FOUND"
            ? 404
            : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          quota: result.quota,
          quotaRemaining: result.quotaRemaining,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? "Rescue deal berhasil diklaim",
      data: {
        code: result.code,
        paid: result.paid,
        paymentUrl: result.paymentUrl,
        quota: result.quota,
        quotaRemaining: result.quotaRemaining,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
