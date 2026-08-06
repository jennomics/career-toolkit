import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

// DELETE /api/tracker/job-contacts/:id - Unlink a contact from a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.jobContact.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Job-contact link not found");
    }

    await prisma.jobContact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tracker/job-contacts/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
