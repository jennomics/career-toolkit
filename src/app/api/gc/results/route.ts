import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Bearer token auth check.
 */
function authenticate(request: NextRequest): boolean {
  const token = process.env.GC_AUTH_TOKEN;
  if (!token) return true; // No token configured = open (dev mode)

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
  return bearerToken === token;
}

/**
 * POST /api/gc/results
 *
 * Groundcrew reports command execution results.
 * Body: { id: string, status: "success" | "failed", stdout?: string, stderr?: string, exitCode?: number, duration?: number }
 */
export async function POST(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId: crypto.randomUUID() } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, stdout, stderr, exitCode, duration } = body;

    if (!id || !status) {
      return validationError("id and status are required");
    }

    if (!["success", "failed"].includes(status)) {
      return validationError("status must be 'success' or 'failed'");
    }

    const updated = await prisma.agentCommand.update({
      where: { id },
      data: {
        status,
        stdout: stdout || null,
        stderr: stderr || null,
        exitCode: typeof exitCode === "number" ? exitCode : null,
        duration: typeof duration === "number" ? duration : null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/gc/results error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * GET /api/gc/results
 *
 * Returns recent completed commands (for status dashboard).
 * Optional: ?limit=20
 */
export async function GET(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId: crypto.randomUUID() } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const results = await prisma.agentCommand.findMany({
      where: { status: { in: ["success", "failed"] } },
      orderBy: { updatedAt: "desc" },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ results, count: results.length });
  } catch (err) {
    console.error("GET /api/gc/results error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
