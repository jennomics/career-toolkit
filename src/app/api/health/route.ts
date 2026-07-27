import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Health check endpoint — verifies the app is running and can reach the database.
 * Used by: CI/CD, Sentinel agent, Vercel monitoring, uptime checks.
 *
 * GET /api/health
 * Returns: { status: "healthy", db: "connected", timestamp, version }
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

  // Check database connectivity
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbLatencyMs: number | null = null;
  let jobCount: number | null = null;

  try {
    const start = Date.now();
    const result = await prisma.job.count();
    dbLatencyMs = Date.now() - start;
    dbStatus = "connected";
    jobCount = result;
  } catch (error) {
    // DB is unreachable — report but don't crash
    console.error("[health] Database check failed:", error);
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      db: dbStatus,
      dbLatencyMs,
      jobCount,
      timestamp,
      version,
      uptime: process.uptime(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
