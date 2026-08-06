import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";
import { PIPELINE_STAGES, groupJobsByStage } from "@/lib/tracker-helpers";

// GET /api/tracker/pipeline - Returns jobs grouped by status stage with counts
export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      include: { skills: true, followUps: true },
      orderBy: { updatedAt: "desc" },
    });

    const pipeline = groupJobsByStage(jobs);

    return NextResponse.json({
      stages: PIPELINE_STAGES,
      pipeline,
      totalJobs: jobs.length,
    });
  } catch (err) {
    console.error("GET /api/tracker/pipeline error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
