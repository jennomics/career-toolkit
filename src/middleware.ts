import { NextRequest, NextResponse } from "next/server";
import { llmRateLimiter, generalRateLimiter } from "./lib/rate-limit";

export const config = {
  matcher: ["/api/:path*"],
};

/** LLM route path prefixes that get stricter rate limiting. */
const LLM_ROUTE_PATTERNS = [
  "/api/resume/generate",
  "/api/resume/generate-company",
  "/api/resume/gap-analysis",
  "/api/experience/extract",
  "/api/parse-job",
];

function isLLMRoute(pathname: string): boolean {
  return LLM_ROUTE_PATTERNS.some((p) => pathname.startsWith(p)) ||
    // project sub-routes: build, improve, cover-letter
    /^\/api\/resume\/project\/[^/]+\/(build|improve|cover-letter)$/.test(pathname);
}

/** Returns a client identifier for rate limiting (IP-based). */
function getClientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // a. GET /api/health - always pass through (public)
  if (pathname === "/api/health" && method === "GET") {
    return NextResponse.next();
  }

  const requestId = crypto.randomUUID();

  // b. Service token check for sentinel and integrity POST requests.
  //    These routes skip AUTH_SECRET and only require SERVICE_TOKEN.
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
    // Service routes pass through after token check (no AUTH_SECRET required)
    return NextResponse.next();
  }

  // c. Demo mode
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

  // d. Not demo mode - check AUTH_SECRET if configured
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

  // e. Rate limiting
  const clientKey = getClientKey(request);
  const rateLimiter = isLLMRoute(pathname) ? llmRateLimiter : generalRateLimiter;
  const result = rateLimiter.checkRateLimit(clientKey);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.retryAfterMs || 1000) / 1000);
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          requestId,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  return NextResponse.next();
}
