/**
 * POST /api/eval/run
 *
 * Triggers batch evaluation.
 * Accepts { goldenPackageId?, text?, documentType? }
 *
 * For golden package runs: non-blocking, returns run IDs immediately.
 * For simple text evaluation: runs synchronously and returns results.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  formatErrorResponse,
  generateRequestId,
  validationError,
} from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { runFullEval } from "@/lib/eval/runner";
import { runGoldenPackage } from "@/lib/eval/golden";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const { goldenPackageId, text, documentType, postingVocabulary, anchorTexts } = body;

    // Must provide either text or goldenPackageId
    if (!text && !goldenPackageId) {
      return validationError(
        "Either text or goldenPackageId is required",
        requestId
      );
    }

    // Golden package batch run (non-blocking)
    if (goldenPackageId && !text) {
      // Verify golden package exists
      const pkg = await prisma.evalGoldenPackage.findUnique({
        where: { id: goldenPackageId },
      });

      if (!pkg) {
        return validationError(
          `Golden package ${goldenPackageId} not found`,
          requestId
        );
      }

      // Start async run and return immediately
      const runId = crypto.randomUUID();

      // Fire and forget the golden package run
      runGoldenPackage(goldenPackageId).catch((err) => {
        console.error(`Golden package run ${runId} failed:`, err);
      });

      return NextResponse.json({
        status: "started",
        runId,
        goldenPackageId,
        message: "Golden package evaluation started. Poll /api/eval/results for outcomes.",
      });
    }

    // Synchronous text evaluation
    const result = await runFullEval({
      text,
      documentType,
      postingVocabulary,
      anchorTexts,
    });

    return NextResponse.json({
      status: "completed",
      evalRunId: result.evalRunId,
      overallPass: result.overallPass,
      tier1: result.tier1,
      tier2: {
        totalViolations: result.tier2.totalViolations,
        violationsPerThousandWords: result.tier2.violationsPerThousandWords,
      },
      metrics: result.metrics,
    });
  } catch (err) {
    console.error("POST /api/eval/run error:", err);
    return formatErrorResponse(err, requestId);
  }
}
