import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

// GET /api/jobs/:id - Get a single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: { skills: true, responsibilities: true },
    });

    if (!job) {
      return notFoundError("Job not found");
    }

    return NextResponse.json(job);
  } catch (err) {
    console.error("GET /api/jobs/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PATCH /api/jobs/:id - Update a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title, company, location, url, description, status, source, notes,
      skills, dreamCompany, dreamJob, appliedAt, salary, priority,
      nextAction, nextActionDate, rejectionReason,
    } = body;

    // Fetch current job to detect status changes
    const currentJob = await prisma.job.findUnique({ where: { id } });
    if (!currentJob) {
      return notFoundError("Job not found");
    }

    // If skills are provided, delete existing and recreate
    if (skills !== undefined) {
      await prisma.jobSkill.deleteMany({ where: { jobId: id } });
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(company !== undefined && { company }),
        ...(location !== undefined && { location }),
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        ...(dreamCompany !== undefined && { dreamCompany }),
        ...(dreamJob !== undefined && { dreamJob }),
        ...(appliedAt !== undefined && { appliedAt: appliedAt ? new Date(appliedAt) : null }),
        ...(salary !== undefined && { salary }),
        ...(priority !== undefined && { priority }),
        ...(nextAction !== undefined && { nextAction }),
        ...(nextActionDate !== undefined && { nextActionDate: nextActionDate ? new Date(nextActionDate) : null }),
        ...(rejectionReason !== undefined && { rejectionReason }),
        ...(skills !== undefined && {
          skills: {
            create: skills.map((skill: string) => ({ name: skill })),
          },
        }),
      },
      include: { skills: true, responsibilities: true },
    });

    // Auto-create ApplicationEvent on status change
    if (status !== undefined && status !== currentJob.status) {
      try {
        await prisma.applicationEvent.create({
          data: {
            jobId: id,
            eventType: "status_change",
            fromStatus: currentJob.status,
            toStatus: status,
            occurredAt: new Date(),
          },
        });
      } catch (eventErr) {
        // Event logging should not block the update
        console.error("Failed to create status change event:", eventErr);
      }
    }

    return NextResponse.json(job);
  } catch (err) {
    console.error("PATCH /api/jobs/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/jobs/:id - Delete a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/jobs/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
