import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/api/:path*"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // a. GET /api/health - always pass through (public)
  if (pathname === "/api/health" && method === "GET") {
    return NextResponse.next();
  }

  const requestId = crypto.randomUUID();

  // b. Demo mode
  if (process.env.DEMO_MODE === "true") {
    // Allow all GET requests in demo mode
    if (method === "GET") {
      return NextResponse.next();
    }

    // Reject POST/PUT/PATCH/DELETE with 403
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Mutations are disabled in demo mode",
            requestId,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // c. Not demo mode - check AUTH_SECRET if configured
  const authSecret = process.env.AUTH_SECRET;
  if (authSecret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "") || "";

    if (token !== authSecret) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or missing authorization token",
            requestId,
          },
        },
        { status: 401 }
      );
    }
  }

  // d. Service token check for sentinel and integrity POST requests
  if (method === "POST" && (pathname === "/api/sentinel" || pathname === "/api/integrity")) {
    const serviceToken = process.env.SERVICE_TOKEN;
    if (serviceToken) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace(/^Bearer\s+/i, "") || "";

      if (token !== serviceToken) {
        return NextResponse.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Invalid or missing service token",
              requestId,
            },
          },
          { status: 401 }
        );
      }
    }
  }

  return NextResponse.next();
}
