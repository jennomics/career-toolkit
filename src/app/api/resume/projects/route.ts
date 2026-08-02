import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

// GET /api/resume/projects?companySlug=xxx - Get resume projects for a company's jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("companySlug");

    if (!companySlug) {
      return validationError("companySlug query parameter is required");
    }

    // Find the company and its job IDs
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      include: {
        jobs: {
          select: { id: true },
        },
      },
    });

    if (!company) {
      return notFoundError("Company not found");
    }

    const jobIds = company.jobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return NextResponse.json([]);
    }

    // Find resume projects for these jobs
    const projects = await prisma.resumeProject.findMany({
      where: {
        jobId: { in: jobIds },
      },
      select: {
        id: true,
        jobId: true,
        status: true,
        step: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/resume/projects error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
