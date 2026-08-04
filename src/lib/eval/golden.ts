/**
 * Golden Package Runner
 *
 * Runs N generations against a golden package and computes:
 * - Edit distance (character-level Levenshtein normalized to document length)
 * - Variance across runs
 * - Stores results as EvalRun records
 */

import { prisma } from "@/lib/db";
import { guardedLLMCall } from "@/lib/guarded-llm";

export interface GoldenRunResult {
  goldenPackageId: string;
  runs: Array<{
    evalRunId: string;
    editDistance: number;
    generatedOutput: string;
  }>;
  averageEditDistance: number;
  variance: number;
}

/**
 * Computes character-level Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use two-row optimization for memory efficiency
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/**
 * Computes normalized edit distance (0 to 1 scale).
 * 0 = identical, 1 = completely different.
 */
export function normalizedEditDistance(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshteinDistance(a, b) / maxLen;
}

/**
 * Runs a golden package evaluation: generates output N times and computes metrics.
 */
export async function runGoldenPackage(
  goldenPackageId: string,
  runs: number = 3
): Promise<GoldenRunResult> {
  const goldenPackage = await prisma.evalGoldenPackage.findUnique({
    where: { id: goldenPackageId },
  });

  if (!goldenPackage) {
    throw new Error(`Golden package ${goldenPackageId} not found`);
  }

  const runResults: Array<{
    evalRunId: string;
    editDistance: number;
    generatedOutput: string;
  }> = [];

  for (let i = 0; i < runs; i++) {
    // Generate output using the golden package's posting text and claim snapshot
    const prompt = buildGoldenPrompt(
      goldenPackage.postingText,
      goldenPackage.claimSnapshot as Record<string, unknown>
    );

    const response = await guardedLLMCall({
      model: "gpt-4o-2024-08-06",
      messages: [{ role: "user", content: prompt }],
      jsonMode: false,
      temperature: 0.7,
    });

    const generatedOutput = typeof response === "string" ? response : "";

    // Compute edit distance from generated to submitted version
    const editDistance = normalizedEditDistance(
      generatedOutput,
      goldenPackage.submittedVersion
    );

    // Store result as EvalRun
    const evalRun = await prisma.evalRun.create({
      data: {
        goldenPackageId,
        modelId: "gpt-4o-2024-08-06",
        promptVersion: "1.0.0",
        temperature: 0.7,
        editDistance,
        generatedOutput,
        assertionResults: {},
      },
    });

    runResults.push({
      evalRunId: evalRun.id,
      editDistance,
      generatedOutput,
    });
  }

  const distances = runResults.map((r) => r.editDistance);
  const averageEditDistance =
    distances.reduce((sum, d) => sum + d, 0) / distances.length;

  // Compute variance (standard deviation squared)
  const mean = averageEditDistance;
  const variance =
    distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
    distances.length;

  return {
    goldenPackageId,
    runs: runResults,
    averageEditDistance,
    variance,
  };
}

function buildGoldenPrompt(
  postingText: string,
  claimSnapshot: Record<string, unknown>
): string {
  return [
    "Generate a professional document based on the following job posting and candidate claims.",
    "",
    "## Job Posting",
    postingText,
    "",
    "## Candidate Claims",
    JSON.stringify(claimSnapshot, null, 2),
    "",
    "Generate a cover letter that addresses the key requirements.",
  ].join("\n");
}
