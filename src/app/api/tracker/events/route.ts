import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

// GET /api/tracker/events - List application events with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || "";
    const eventType = searchParams.get("eventType") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (jobId) {
      where.jobId = jobId;
    }
    if (eventType) {
      where.eventType = eventType;
    }
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    const events = await prisma.applicationEvent.findMany({
      where,
      orderBy: { occurredAt: "desc" },
    });

    return NextResponse.json(events);
  } catch (err) {
    console.error("GET /api/tracker/events error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/tracker/events - Create an application event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, eventType, fromStatus, toStatus, occurredAt, notes, metadata } = body;

    if (!jobId || !eventType) {
      return validationError("jobId and eventType are required");
    }

    const event = await prisma.applicationEvent.create({
      data: {
        jobId,
        eventType,
        fromStatus: fromStatus || null,
        toStatus: toStatus || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        notes: notes || null,
        metadata: metadata || null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("POST /api/tracker/events error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
