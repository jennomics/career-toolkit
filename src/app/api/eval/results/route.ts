/**
 * GET /api/eval/results
 *
 * Returns historical eval results with trend data.
 * Supports query param ?limit=10 (default).
 */

import { NextRequest, NextResponse } from "next/server";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { computeMetrics } from "@/lib/eval/metrics";

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
      100
    );

    const runs = await prisma.evalRun.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Compute aggregate metrics over the returned runs
    const metrics = computeMetrics(
      runs.map((r) => ({
        id: r.id,
        factScore: r.factScore,
        voiceScore: r.voiceScore,
        editDistance: r.editDistance,
        anchorDiscrimination: r.anchorDiscrimination,
        assertionResults: r.assertionResults,
      }))
    );

    // Compute trend direction (compare last 2 runs if available)
    let trend: "improving" | "declining" | "stable" = "stable";
    if (runs.length >= 2) {
      const latest = runs[0];
      const previous = runs[1];
      if (
        latest.factScore !== null &&
        previous.factScore !== null &&
        latest.factScore > previous.factScore
      ) {
        trend = "improving";
      } else if (
        latest.factScore !== null &&
        previous.factScore !== null &&
        latest.factScore < previous.factScore
      ) {
        trend = "declining";
      }
    }

    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        goldenPackageId: r.goldenPackageId,
        modelId: r.modelId,
        promptVersion: r.promptVersion,
        factScore: r.factScore,
        voiceScore: r.voiceScore,
        editDistance: r.editDistance,
        anchorDiscrimination: r.anchorDiscrimination,
        createdAt: r.createdAt,
      })),
      metrics,
      trend,
      count: runs.length,
    });
  } catch (err) {
    console.error("GET /api/eval/results error:", err);
    return formatErrorResponse(err, requestId);
  }
}
