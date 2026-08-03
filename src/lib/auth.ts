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
 * Checks if the request has a valid Bearer token matching AUTH_SECRET.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null; // No secret configured = skip auth (local dev)

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing authorization header", requestId: crypto.randomUUID() } },
      { status: 401 }
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== secret) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid authorization token", requestId: crypto.randomUUID() } },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Checks if the request has a valid Bearer token matching SERVICE_TOKEN.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function requireServiceToken(request: NextRequest): NextResponse | null {
  const token = process.env.SERVICE_TOKEN;
  if (!token) return null; // No token configured = skip (dev mode)

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
