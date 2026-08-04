/**
 * Eval Metrics Computation
 *
 * Computes aggregate metrics from eval run data.
 * Key design: fact and voice scores are SEPARATE, never aggregated.
 * A high voice score with a failing fact assertion = overall FAIL.
 */

export interface EvalRunInput {
  id: string;
  factScore?: number | null;
  voiceScore?: number | null;
  editDistance?: number | null;
  anchorDiscrimination?: number | null;
  assertionResults: unknown;
}

export interface EvalMetrics {
  editDistance: number;
  regressionPassRate: number;
  propertyViolationsPerThousandWords: number;
  anchorDiscrimination: number;
  variance: number;
  factScore: number;
  voiceScore: number;
  overallPass: boolean;
}

/**
 * Computes aggregate metrics from a set of eval runs.
 *
 * Scoring split: fact and voice scores are separate, never aggregate.
 * A high voice + failing fact = fail.
 */
export function computeMetrics(evalRuns: EvalRunInput[]): EvalMetrics {
  if (evalRuns.length === 0) {
    return {
      editDistance: 0,
      regressionPassRate: 0,
      propertyViolationsPerThousandWords: 0,
      anchorDiscrimination: 0,
      variance: 0,
      factScore: 0,
      voiceScore: 0,
      overallPass: false,
    };
  }

  // Edit distance: average normalized Levenshtein from runs
  const editDistances = evalRuns
    .map((r) => r.editDistance)
    .filter((d): d is number => d !== null && d !== undefined);
  const editDistance =
    editDistances.length > 0
      ? editDistances.reduce((sum, d) => sum + d, 0) / editDistances.length
      : 0;

  // Regression pass rate: percentage of assertions that pass
  let totalAssertions = 0;
  let passedAssertions = 0;

  for (const run of evalRuns) {
    const results = parseAssertionResults(run.assertionResults);
    totalAssertions += results.total;
    passedAssertions += results.passed;
  }

  const regressionPassRate =
    totalAssertions > 0 ? passedAssertions / totalAssertions : 1;

  // Property violations per thousand words: average across runs
  let totalViolationRate = 0;
  let violationRunCount = 0;
  for (const run of evalRuns) {
    const results = parseAssertionResults(run.assertionResults);
    if (results.violationsPerThousandWords !== undefined) {
      totalViolationRate += results.violationsPerThousandWords;
      violationRunCount++;
    }
  }
  const propertyViolationsPerThousandWords =
    violationRunCount > 0 ? totalViolationRate / violationRunCount : 0;

  // Anchor discrimination: gap between golden mean and anchor mean
  const anchorDiscriminations = evalRuns
    .map((r) => r.anchorDiscrimination)
    .filter((d): d is number => d !== null && d !== undefined);
  const anchorDiscrimination =
    anchorDiscriminations.length > 0
      ? anchorDiscriminations.reduce((sum, d) => sum + d, 0) /
        anchorDiscriminations.length
      : 0;

  // Variance: standard deviation of edit distances
  const mean = editDistance;
  const variance =
    editDistances.length > 1
      ? Math.sqrt(
          editDistances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
            editDistances.length
        )
      : 0;

  // Fact score: average of non-null fact scores
  const factScores = evalRuns
    .map((r) => r.factScore)
    .filter((s): s is number => s !== null && s !== undefined);
  const factScore =
    factScores.length > 0
      ? factScores.reduce((sum, s) => sum + s, 0) / factScores.length
      : 0;

  // Voice score: average of non-null voice scores
  const voiceScores = evalRuns
    .map((r) => r.voiceScore)
    .filter((s): s is number => s !== null && s !== undefined);
  const voiceScore =
    voiceScores.length > 0
      ? voiceScores.reduce((sum, s) => sum + s, 0) / voiceScores.length
      : 0;

  // Overall pass: both fact AND voice must pass independently
  // Fact passes if all fact assertions pass (regressionPassRate = 1.0)
  // Voice passes if voiceScore > 0.7 threshold
  const factPasses = regressionPassRate === 1.0;
  const voicePasses = voiceScore >= 0.7 || voiceScores.length === 0;
  const overallPass = factPasses && voicePasses;

  return {
    editDistance,
    regressionPassRate,
    propertyViolationsPerThousandWords,
    anchorDiscrimination,
    variance,
    factScore,
    voiceScore,
    overallPass,
  };
}

interface ParsedAssertionResults {
  total: number;
  passed: number;
  violationsPerThousandWords?: number;
}

function parseAssertionResults(results: unknown): ParsedAssertionResults {
  if (!results || typeof results !== "object") {
    return { total: 0, passed: 0 };
  }

  const obj = results as Record<string, unknown>;

  // Handle array format: [{ passed: true/false }]
  if (Array.isArray(results)) {
    const total = results.length;
    const passed = results.filter(
      (r) => typeof r === "object" && r !== null && (r as { passed?: boolean }).passed
    ).length;
    return { total, passed };
  }

  // Handle object format: { results: [...], violationsPerThousandWords: number }
  if (Array.isArray(obj.results)) {
    const total = obj.results.length;
    const passed = obj.results.filter(
      (r: unknown) => typeof r === "object" && r !== null && (r as { passed?: boolean }).passed
    ).length;
    return {
      total,
      passed,
      violationsPerThousandWords: typeof obj.violationsPerThousandWords === "number"
        ? obj.violationsPerThousandWords
        : undefined,
    };
  }

  return { total: 0, passed: 0 };
}
