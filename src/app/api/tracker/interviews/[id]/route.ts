import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

// PATCH /api/tracker/interviews/:id - Update an interview
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      round, interviewType, scheduledAt, durationMinutes,
      interviewers, location, meetingLink, notes, outcome, feedback,
    } = body;

    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Interview not found");
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: {
        ...(round !== undefined && { round }),
        ...(interviewType !== undefined && { interviewType }),
        ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(interviewers !== undefined && { interviewers }),
        ...(location !== undefined && { location }),
        ...(meetingLink !== undefined && { meetingLink }),
        ...(notes !== undefined && { notes }),
        ...(outcome !== undefined && { outcome }),
        ...(feedback !== undefined && { feedback }),
      },
    });

    return NextResponse.json(interview);
  } catch (err) {
    console.error("PATCH /api/tracker/interviews/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/tracker/interviews/:id - Delete an interview
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.interview.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Interview not found");
    }

    await prisma.interview.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tracker/interviews/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
