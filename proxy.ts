import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy Convention (replaces middleware.ts)
 * Menangani otomatis redirect ke halaman /maintenance saat MAINTENANCE_MODE aktif.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 1. Izinkan akses langsung ke path internal, asset statis, dan API tertentu
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Cek apakah pengguna melakukan bypass via query param (misal: ?bypass=vesta2026)
  const bypassParam = searchParams.get("bypass");
  const bypassSecret = process.env.MAINTENANCE_BYPASS_KEY || "vesta2026";

  if (bypassParam === bypassSecret) {
    const response = NextResponse.redirect(new URL("/", request.url));
    // Set cookie bypass selama 2 jam
    response.cookies.set("vesta_maintenance_bypass", "true", {
      path: "/",
      maxAge: 60 * 60 * 2,
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  }

  // 3. Cek apakah ada cookie bypass yang valid
  const hasBypassCookie = request.cookies.get("vesta_maintenance_bypass")?.value === "true";
  if (hasBypassCookie) {
    return NextResponse.next();
  }

  // 4. Periksa apakah sistem sedang dalam mode maintenance
  // Default aktif jika MAINTENANCE_MODE="true", atau jika di-trigger oleh header/env
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";

  if (isMaintenance) {
    // Jika sudah di halaman /maintenance, jangan redirect berulang (loop)
    if (pathname === "/maintenance") {
      return NextResponse.next();
    }

    // Redirect semua rute lainnya ke /maintenance
    const maintenanceUrl = new URL("/maintenance", request.url);
    return NextResponse.redirect(maintenanceUrl);
  }

  // 5. Jika maintenance TIDAK aktif, akses berjalan normal
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Menerapkan proxy ke seluruh rute halaman web
     * Kecuali file internal Next.js dan file statis
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
