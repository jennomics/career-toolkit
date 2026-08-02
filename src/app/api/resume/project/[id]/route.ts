import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/resume/project/[id] - Get a resume project with full details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.resumeProject.findUnique({ where: { id } });
    if (!project) {
      return notFoundError("Project not found");
    }

    // Also fetch the associated job details
    const job = await prisma.job.findUnique({
      where: { id: project.jobId },
      include: { skills: true, responsibilities: true },
    });

    return NextResponse.json({ ...project, job });
  } catch (err) {
    console.error("GET /api/resume/project/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * PATCH /api/resume/project/[id] - Update a resume project (step progress, content, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.resumeProject.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Project not found");
    }

    const {
      status,
      step,
      gapAnalysis,
      selectedHighlights,
      resumeContent,
      resumeMarkdown,
      coverLetterContent,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (step !== undefined) updateData.step = step;
    if (gapAnalysis !== undefined) updateData.gapAnalysis = gapAnalysis;
    if (selectedHighlights !== undefined) updateData.selectedHighlights = selectedHighlights;
    if (resumeContent !== undefined) updateData.resumeContent = resumeContent;
    if (resumeMarkdown !== undefined) updateData.resumeMarkdown = resumeMarkdown;
    if (coverLetterContent !== undefined) updateData.coverLetterContent = coverLetterContent;

    const project = await prisma.resumeProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (err) {
    console.error("PATCH /api/resume/project/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * DELETE /api/resume/project/[id] - Delete a resume project
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.resumeProject.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Project not found");
    }

    await prisma.resumeProject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/resume/project/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
