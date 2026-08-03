import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  formatErrorResponse,
  generateRequestId,
  notFoundError,
} from "@/lib/api-error";

interface StoredHiringQuestion {
  question: string;
  rationale?: string;
  claimIds: string[];
  gap: boolean;
}

// GET /api/decomposition/[jobId]/gaps - Get gap report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const decomposition = await prisma.postingDecomposition.findUnique({
      where: { jobId },
    });

    if (!decomposition) {
      return notFoundError("Decomposition not found for this job");
    }

    const hiringQuestions = decomposition.hiringQuestions as unknown as StoredHiringQuestion[];
    const gaps = hiringQuestions.filter((q) => q.gap === true);

    return NextResponse.json({
      gaps: gaps.map((g) => ({
        question: g.question,
        rationale: g.rationale || null,
      })),
      totalQuestions: hiringQuestions.length,
      gapCount: gaps.length,
    });
  } catch (err) {
    console.error("GET /api/decomposition/[jobId]/gaps error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
