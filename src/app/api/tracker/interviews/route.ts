import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

// GET /api/tracker/interviews - List interviews with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || "";
    const outcome = searchParams.get("outcome") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (jobId) {
      where.jobId = jobId;
    }
    if (outcome) {
      where.outcome = outcome;
    }

    const interviews = await prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(interviews);
  } catch (err) {
    console.error("GET /api/tracker/interviews error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/tracker/interviews - Create an interview
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jobId, round, interviewType, scheduledAt, durationMinutes,
      interviewers, location, meetingLink, notes, outcome,
    } = body;

    if (!jobId || !interviewType || !scheduledAt) {
      return validationError("jobId, interviewType, and scheduledAt are required");
    }

    const interview = await prisma.interview.create({
      data: {
        jobId,
        round: round || 1,
        interviewType,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || null,
        interviewers: interviewers || null,
        location: location || null,
        meetingLink: meetingLink || null,
        notes: notes || null,
        outcome: outcome || "pending",
      },
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (err) {
    console.error("POST /api/tracker/interviews error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
