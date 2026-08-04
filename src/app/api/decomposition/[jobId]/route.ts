import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decomposePosting } from "@/lib/decomposition/decompose";
import { mapClaimsToQuestions } from "@/lib/decomposition/mapping";
import {
  formatErrorResponse,
  generateRequestId,
  notFoundError,
} from "@/lib/api-error";

// GET /api/decomposition/[jobId] - Retrieve stored decomposition
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

    // Collect all referenced claim IDs from hiring questions
    const questions = decomposition.hiringQuestions as Array<{
      claimIds?: string[];
    }>;
    const allClaimIds = new Set<string>();
    for (const q of questions) {
      if (q.claimIds) {
        for (const id of q.claimIds) {
          allClaimIds.add(id);
        }
      }
    }

    // Fetch claim statements for all referenced claims
    let claimStatements: Record<string, string> = {};
    if (allClaimIds.size > 0) {
      const claims = await prisma.claim.findMany({
        where: { id: { in: Array.from(allClaimIds) } },
        select: { id: true, statement: true },
      });
      claimStatements = Object.fromEntries(
        claims.map((c) => [c.id, c.statement])
      );
    }

    return NextResponse.json({ ...decomposition, claimStatements });
  } catch (err) {
    console.error("GET /api/decomposition/[jobId] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/decomposition/[jobId] - Generate or regenerate decomposition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Fetch the job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return notFoundError("Job not found");
    }

    // Run decomposition
    const result = await decomposePosting(
      job.description,
      job.title,
      job.company
    );

    // Fetch all active claims (not superseded) with artifacts
    const claims = await prisma.claim.findMany({
      where: { status: { not: "superseded" } },
      include: { artifacts: { select: { passageText: true } } },
    });

    // Map claims to hiring questions
    const mappingReport = mapClaimsToQuestions(
      result.hiringQuestions,
      claims.map((c) => ({
        id: c.id,
        statement: c.statement,
        artifacts: c.artifacts,
      }))
    );

    // Upsert the decomposition record
    const hiringQuestionsJson = JSON.parse(JSON.stringify(mappingReport.questions));
    const decomposition = await prisma.postingDecomposition.upsert({
      where: { jobId },
      create: {
        jobId,
        problemStatement: result.problemStatement,
        responsibilities: result.responsibilities,
        statedBars: result.statedBars,
        vocabulary: result.vocabulary,
        hiringQuestions: hiringQuestionsJson,
        partialExtraction: result.partialExtraction,
      },
      update: {
        problemStatement: result.problemStatement,
        responsibilities: result.responsibilities,
        statedBars: result.statedBars,
        vocabulary: result.vocabulary,
        hiringQuestions: hiringQuestionsJson,
        partialExtraction: result.partialExtraction,
      },
    });

    return NextResponse.json(decomposition, { status: 201 });
  } catch (err) {
    console.error("POST /api/decomposition/[jobId] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
