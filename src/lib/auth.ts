import { NextRequest, NextResponse } from "next/server";

/**
 * Auth utility helpers.
 *
 * NOTE: The middleware (src/middleware.ts) reimplements auth logic directly
 * for performance and fail-closed semantics. These utilities remain available
 * for route-level auth checks and are used by llm-parse-job.ts (isDemoMode).
 * They can also serve as the foundation for future session-based auth if needed.
 */

/**
 * Checks if the request has a valid Bearer token matching SERVICE_TOKEN.
 * Returns null if valid, or a 401 NextResponse if invalid.
 * Fails closed: if SERVICE_TOKEN is not configured, rejects the request.
 */
export function requireServiceToken(request: NextRequest): NextResponse | null {
  const token = process.env.SERVICE_TOKEN;
  if (!token) {
    // Fail closed: no token configured means service auth cannot succeed
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Service token not configured", requestId: crypto.randomUUID() } },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing service token", requestId: crypto.randomUUID() } },
      { status: 401 }
    );
  }

  const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (bearerToken !== token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid service token", requestId: crypto.randomUUID() } },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Returns true if the application is running in demo mode.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * If in demo mode and the request is a mutation (POST/PUT/PATCH/DELETE),
 * returns a 403 response. Returns null if the request is allowed.
 */
export function rejectMutationInDemo(request: NextRequest): NextResponse | null {
  if (!isDemoMode()) return null;

  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Mutations are disabled in demo mode",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 403 }
    );
  }

  return null;
}
