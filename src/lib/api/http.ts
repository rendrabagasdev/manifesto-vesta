import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import type { SessionUser } from "@/src/lib/auth/session";
import type { UserRole } from "@/src/lib/auth/roles";

export type ApiErrorDetails = Record<string, unknown> | undefined;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails;

  constructor(
    message: string,
    status = 400,
    code = "BAD_REQUEST",
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(
  data: T,
  message?: string,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      message: message ?? null,
    } satisfies Record<string, unknown>,
    init,
  );
}

export function fail(
  error: string,
  status = 400,
  details?: ApiErrorDetails,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error,
      message: null,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return fail(error.message, error.status, {
      code: error.code,
      ...error.details,
    });
  }

  if (error instanceof ZodError) {
    return fail("Validasi gagal", 422, {
      code: "VALIDATION_ERROR",
      fields: error.flatten().fieldErrors,
    });
  }

  const message = error instanceof Error ? error.message : String(error);

  // NextAuth redirects / connection errors should never leak internals.
  if (message.includes("NEXT_REDIRECT")) {
    return fail("Silakan masuk terlebih dahulu", 401, {
      code: "UNAUTHENTICATED",
    });
  }

  console.error("[api] unhandled error:", error);
  return fail("Terjadi kesalahan pada server", 500, {
    code: "INTERNAL_ERROR",
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireApiUser(
  roles?: readonly UserRole[],
): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    throw new ApiError("Silakan masuk terlebih dahulu", 401, "UNAUTHENTICATED");
  }

  if (roles && !roles.includes(user.role)) {
    throw new ApiError(
      "Peran akun Anda tidak memiliki akses ke resource ini",
      403,
      "FORBIDDEN",
    );
  }

  return user;
}

export async function optionalApiUser(): Promise<SessionUser | null> {
  try {
    return await getSessionUser();
  } catch {
    return null;
  }
}

export function userIdOf(user: SessionUser): number {
  const id = Number(user.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiError("Sesi pengguna tidak valid", 401, "INVALID_SESSION");
  }
  return id;
}

export function parsePositiveInt(
  value: string | null,
  label = "ID",
): number {
  if (!value) {
    throw new ApiError(`${label} wajib diisi`, 400, "INVALID_PARAM");
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ApiError(`${label} tidak valid`, 400, "INVALID_PARAM");
  }
  return parsed;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Body JSON tidak valid", 400, "INVALID_JSON");
  }
}

export function parsePagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const rawOffset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

  const limit = Number.isFinite(rawLimit)
    ? Math.min(100, Math.max(1, rawLimit))
    : 20;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  return { limit, offset };
}
