import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RouteCheck {
  route: string;
  method: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * POST /api/sentinel
 *
 * Smoke-tests all API routes to verify they respond correctly.
 * Can be triggered by groundcrew after restart, or manually.
 * Does NOT require auth — it only reads, never writes.
 *
 * Returns: { overall: "pass" | "fail", checks: [...], duration: number }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Determine base URL from request
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const checks: RouteCheck[] = [];

  // Define routes to check
  const routes: { route: string; method: string; body?: object }[] = [
    { route: "/api/health", method: "GET" },
    { route: "/api/jobs", method: "GET" },
    { route: "/api/phrases", method: "GET" },
    { route: "/api/gc/commands", method: "GET" },
    { route: "/api/gc/results", method: "GET" },
    { route: "/api/resume/generate", method: "POST", body: { targetRole: "__sentinel_test__" } },
    { route: "/api/resume/gap-analysis", method: "POST", body: { description: "This is a sentinel test job description with Python, AWS, and machine learning requirements for a senior engineer role." } },
    { route: "/api/jobs/check-duplicate", method: "POST", body: { title: "__sentinel__", company: "__test__", description: "" } },
  ];

  for (const { route, method, body } of routes) {
    const checkStart = Date.now();
    try {
      const res = await fetch(`${baseUrl}${route}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const latencyMs = Date.now() - checkStart;

      // For resume/generate with dummy data, 400 is acceptable (means route works, just bad input)
      const acceptableStatuses = route.includes("resume/generate") ? [200, 400] : [200];
      const isOk = acceptableStatuses.includes(res.status) || (res.status < 500);

      checks.push({
        route,
        method,
        status: res.status,
        ok: isOk,
        latencyMs,
      });
    } catch (err) {
      checks.push({
        route,
        method,
        status: 0,
        ok: false,
        latencyMs: Date.now() - checkStart,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  const failedChecks = checks.filter((c) => !c.ok);
  const overall = failedChecks.length === 0 ? "pass" : "fail";

  return NextResponse.json({
    overall,
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    passed: checks.filter((c) => c.ok).length,
    failed: failedChecks.length,
    total: checks.length,
    checks,
  });
}

/**
 * GET /api/sentinel
 *
 * Returns usage instructions.
 */
export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to run a full smoke test of all API routes.",
    usage: "POST /api/sentinel",
    description: "Sentinel verifies all routes respond without 500 errors. Run after deploys or restarts.",
  });
}
