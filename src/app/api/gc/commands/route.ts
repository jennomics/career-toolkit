import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Bearer token auth check.
 * GC_AUTH_TOKEN must be set in env for both Kiro (sender) and Groundcrew (poller).
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
 * GET /api/gc/commands
 *
 * Groundcrew polls this endpoint for pending commands.
 * Returns commands with status "pending" (oldest first).
 * Optional: ?status=running to check in-flight commands.
 */
export async function GET(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const commands = await prisma.agentCommand.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
      take: Math.min(limit, 50),
    });

    return NextResponse.json({ commands, count: commands.length });
  } catch (err) {
    console.error("GET /api/gc/commands error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * POST /api/gc/commands
 *
 * Kiro creates a new command for Groundcrew to execute.
 * Body: { command: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { command, description } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "command (string) is required" },
        { status: 400 }
      );
    }

    const created = await prisma.agentCommand.create({
      data: {
        command,
        description: description || null,
        status: "pending",
        source: "kiro",
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/gc/commands error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * PATCH /api/gc/commands
 *
 * Groundcrew claims a command (sets status to "running").
 * Body: { id: string, status: "running" }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!authenticate(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    if (!["running", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'running' or 'pending'" },
        { status: 400 }
      );
    }

    const updated = await prisma.agentCommand.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/gc/commands error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
