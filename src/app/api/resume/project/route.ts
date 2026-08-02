import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/resume/project - List all resume projects (or filter by jobId)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (jobId) where.jobId = jobId;

    const projects = await prisma.resumeProject.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/resume/project error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * POST /api/resume/project - Create a new resume project for a job
 * Body: { jobId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return validationError("jobId is required");
    }

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return notFoundError("Job not found");
    }

    const project = await prisma.resumeProject.create({
      data: {
        jobId,
        status: "draft",
        step: 1,
        llmModel: "gpt-4o",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("POST /api/resume/project error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
