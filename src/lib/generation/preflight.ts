/**
 * Stage 1: Pre-Flight Checks
 *
 * Verifies generation readiness:
 * - PostingDecomposition exists for the jobId
 * - Claims are mapped to hiring questions
 * - No strict gap violations
 * - Non-empty context blocks (profile exists, claims exist)
 */

import { prisma } from "@/lib/db";
import { mapClaimsToQuestions } from "@/lib/decomposition/mapping";
import type {
  GenerationOptions,
  PreflightResult,
  DecompositionData,
  MappedQuestion,
} from "./types";

export async function runPreflight(
  options: GenerationOptions
): Promise<PreflightResult> {
  const errors: string[] = [];

  // 1. Verify PostingDecomposition exists
  const decomposition = await prisma.postingDecomposition.findUnique({
    where: { jobId: options.jobId },
  });

  if (!decomposition) {
    return {
      passed: false,
      decomposition: null,
      mappedQuestions: [],
      errors: [
        `No PostingDecomposition found for jobId: ${options.jobId}. Run decomposition first.`,
      ],
    };
  }

  // 2. Fetch active claims for mapping
  const claims = await prisma.claim.findMany({
    where: { status: { not: "superseded" } },
    include: { artifacts: { select: { passageText: true } } },
  });

  if (claims.length === 0) {
    errors.push("No active claims found in the claims ledger.");
  }

  // 3. Map claims to hiring questions
  const hiringQuestions = decomposition.hiringQuestions as Array<{
    question: string;
    rationale: string;
  }>;

  const mappingReport = mapClaimsToQuestions(
    hiringQuestions,
    claims.map((c) => ({
      id: c.id,
      statement: c.statement,
      artifacts: c.artifacts,
    }))
  );

  // 4. Check strict gaps if option is enabled
  if (options.options?.strictGaps) {
    const gaps = mappingReport.questions.filter((q) => q.gap);
    if (gaps.length > 0) {
      errors.push(
        `Strict gaps mode: ${gaps.length} hiring question(s) have no matching claims: ${gaps.map((g) => g.question).join("; ")}`
      );
    }
  }

  // 5. Verify non-empty context blocks
  const profile = await prisma.candidateProfile.findFirst();
  if (!profile) {
    errors.push("No candidate profile found. Profile context will be empty.");
  }

  const decompositionData: DecompositionData = {
    id: decomposition.id,
    jobId: decomposition.jobId,
    problemStatement: decomposition.problemStatement,
    responsibilities: decomposition.responsibilities,
    statedBars: decomposition.statedBars,
    vocabulary: decomposition.vocabulary,
    hiringQuestions: mappingReport.questions as MappedQuestion[],
  };

  return {
    passed: errors.length === 0,
    decomposition: decompositionData,
    mappedQuestions: mappingReport.questions as MappedQuestion[],
    errors,
  };
}
