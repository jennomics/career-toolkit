import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";
import { PIPELINE_STAGES } from "@/lib/tracker-helpers";

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

    // Validate status against known pipeline stages
    if (status !== undefined && !(PIPELINE_STAGES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Invalid status "${status}". Valid values: ${PIPELINE_STAGES.join(", ")}`, requestId: generateRequestId() } },
        { status: 400 }
      );
    }

    const updateData = {
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
    };

    // Wrap status change + event creation (and skill deletion if needed) in a
    // transaction for atomicity. This ensures skills are not deleted if the
    // status update or event creation fails.
    if (status !== undefined && status !== currentJob.status) {
      const ops = [
        ...(skills !== undefined
          ? [prisma.jobSkill.deleteMany({ where: { jobId: id } })]
          : []),
        prisma.job.update({
          where: { id },
          data: updateData,
          include: { skills: true, responsibilities: true },
        }),
        prisma.applicationEvent.create({
          data: {
            jobId: id,
            eventType: "status_change",
            fromStatus: currentJob.status,
            toStatus: status,
            occurredAt: new Date(),
          },
        }),
      ];
      const results = await prisma.$transaction(ops);
      // The job update result is after the optional deleteMany
      const updatedJob = skills !== undefined ? results[1] : results[0];
      return NextResponse.json(updatedJob);
    }

    // Non-status-change path: delete skills outside transaction (no event to keep consistent with)
    if (skills !== undefined) {
      await prisma.jobSkill.deleteMany({ where: { jobId: id } });
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: { skills: true, responsibilities: true },
    });

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
