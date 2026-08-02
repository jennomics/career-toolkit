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

/** Service routes that require SERVICE_TOKEN authentication. */
function isServiceRoute(pathname: string, method: string): boolean {
  return method === "POST" && (pathname === "/api/sentinel" || pathname === "/api/integrity");
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

  // 1. Health check - always pass through (public, no rate limiting)
  if (pathname === "/api/health" && method === "GET") {
    return NextResponse.next();
  }

  const requestId = crypto.randomUUID();

  // 2. Rate limiting FIRST - before any auth or mode checks
  //    This protects against brute-force attacks on auth endpoints,
  //    abuse of demo mode, and service route flooding.
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

  // 3. Service routes - require SERVICE_TOKEN, fail CLOSED when not set
  if (isServiceRoute(pathname, method)) {
    const serviceToken = process.env.SERVICE_TOKEN;

    // Fail closed: if SERVICE_TOKEN is not configured, reject all service requests
    if (!serviceToken) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Service token not configured",
            requestId,
          },
        },
        { status: 401 }
      );
    }

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

    // Valid service token - allow through
    return NextResponse.next();
  }

  // 4. Demo mode - allow reads, block mutations
  if (process.env.DEMO_MODE === "true") {
    if (method === "GET") {
      return NextResponse.next();
    }

    // Block all mutations in demo mode
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

  // 5. Normal (private) mode - app is open behind Vercel Deployment Protection
  //    No application-level auth for browser requests. The deployment itself
  //    is protected at the infrastructure level (Vercel password gate / SSO).
  return NextResponse.next();
}
