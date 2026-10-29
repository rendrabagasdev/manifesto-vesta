import { NextRequest, NextResponse } from "next/server";
import { placeOrderAction } from "@/app/actions/orders";
import { ApiError, handleApiError } from "@/src/lib/api/http";

/**
 * POST /api/orders
 * REST wrapper untuk placeOrderAction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => {
      throw new ApiError("Body request tidak valid", 400, "INVALID_BODY");
    });

    const result = await placeOrderAction(body);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? "Pesanan berhasil dibuat",
      data: {
        code: result.code,
        paid: result.paid,
        paymentUrl: result.paymentUrl,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
