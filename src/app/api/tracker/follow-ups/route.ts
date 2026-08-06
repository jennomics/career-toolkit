import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

// GET /api/tracker/follow-ups - List follow-ups with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || "";
    const completed = searchParams.get("completed") || "";
    const priority = searchParams.get("priority") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (jobId) {
      where.jobId = jobId;
    }
    if (completed === "true") {
      where.completedAt = { not: null };
    } else if (completed === "false") {
      where.completedAt = null;
    }
    if (priority) {
      where.priority = priority;
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: { job: { select: { id: true, title: true, company: true } } },
    });

    return NextResponse.json(followUps);
  } catch (err) {
    console.error("GET /api/tracker/follow-ups error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/tracker/follow-ups - Create a follow-up
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action, dueDate, notes, priority } = body;

    if (!jobId || !action || !dueDate) {
      return validationError("jobId, action, and dueDate are required");
    }

    const followUp = await prisma.followUp.create({
      data: {
        jobId,
        action,
        dueDate: new Date(dueDate),
        notes: notes || null,
        priority: priority || "medium",
      },
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (err) {
    console.error("POST /api/tracker/follow-ups error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
