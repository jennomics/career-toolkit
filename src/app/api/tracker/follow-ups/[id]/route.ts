import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

// PATCH /api/tracker/follow-ups/:id - Update or complete a follow-up
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { action, dueDate, notes, priority, completedAt, complete } = body;

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Follow-up not found");
    }

    // If "complete: true" is sent, set completedAt to now
    const completedValue = complete === true
      ? new Date()
      : completedAt !== undefined
        ? (completedAt ? new Date(completedAt) : null)
        : undefined;

    const followUp = await prisma.followUp.update({
      where: { id },
      data: {
        ...(action !== undefined && { action }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(priority !== undefined && { priority }),
        ...(completedValue !== undefined && { completedAt: completedValue }),
      },
    });

    return NextResponse.json(followUp);
  } catch (err) {
    console.error("PATCH /api/tracker/follow-ups/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/tracker/follow-ups/:id - Delete a follow-up
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Follow-up not found");
    }

    await prisma.followUp.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tracker/follow-ups/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
