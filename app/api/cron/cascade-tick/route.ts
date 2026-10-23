import { NextRequest, NextResponse } from "next/server";
import { runCascadeTick } from "@/src/lib/cascade/service";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET belum dikonfigurasi" },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Tidak terotorisasi" },
      { status: 401 },
    );
  }

  try {
    const result = await runCascadeTick(new Date());
    return NextResponse.json({
      success: true,
      message: "Cascade tick berhasil dijalankan",
      data: result,
    });
  } catch (error) {
    console.error("cascade cron tick error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menjalankan cascade tick" },
      { status: 500 },
    );
  }
}
