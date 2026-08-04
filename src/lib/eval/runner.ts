/**
 * Eval Runner - Orchestrates full evaluation runs
 *
 * Callable from both API and batch contexts.
 * Runs Tier 1 assertions, Tier 2 property checks,
 * optional golden packages, and anchor scoring.
 */

import { prisma } from "@/lib/db";
import { runTier1Assertions, type Tier1Result } from "./assertions";
import {
  contractionRate,
  ruleOfThreeDetector,
  landingDetector,
  vocabularyOverlap,
  exhibitAdjacency,
  intraDocRepetition,
  comprehensionFlag,
  type PropertyResult,
} from "./properties";
import { scoreAnchors, type AnchorScoreResult } from "./anchors";
import { runGoldenPackage, type GoldenRunResult } from "./golden";
import { computeMetrics, type EvalMetrics } from "./metrics";

export interface Tier2Result {
  results: Record<string, PropertyResult>;
  totalViolations: number;
  violationsPerThousandWords: number;
}

interface SpanInput {
  text: string;
  claimId?: string | null;
  modelSupplied?: boolean;
}

export interface FullEvalOptions {
  text?: string;
  documentType?: string;
  postingVocabulary?: string[];
  spans?: SpanInput[];
  goldenPackageIds?: string[];
  anchorTexts?: string[];
  modelId?: string;
  promptVersion?: string;
}

export interface FullEvalResult {
  tier1: Tier1Result;
  tier2: Tier2Result;
  golden?: GoldenRunResult[];
  anchors?: AnchorScoreResult;
  metrics: EvalMetrics;
  evalRunId?: string;
  overallPass: boolean;
}

/**
 * Runs Tier 1 assertions on provided text.
 */
export async function runTier1(
  text: string,
  documentType?: string
): Promise<Tier1Result> {
  return runTier1Assertions(text, documentType);
}

/**
 * Runs Tier 2 property checks on provided text.
 */
export function runTier2(
  text: string,
  documentType?: string,
  postingVocabulary?: string[],
  spans?: SpanInput[]
): Tier2Result {
  const results: Record<string, PropertyResult> = {};

  results.contractionRate = contractionRate(text);
  results.ruleOfThree = ruleOfThreeDetector(text);
  results.landing = landingDetector(text);
  results.vocabularyOverlap = vocabularyOverlap(
    text,
    postingVocabulary || []
  );
  results.exhibitAdjacency = exhibitAdjacency(text, spans || []);
  results.intraDocRepetition = intraDocRepetition(text);
  results.comprehension = comprehensionFlag(text);

  const totalViolations = Object.values(results).reduce(
    (sum, r) => sum + r.violations.length,
    0
  );

  const totalRate = Object.values(results).reduce(
    (sum, r) => sum + r.violationsPerThousandWords,
    0
  );

  return {
    results,
    totalViolations,
    violationsPerThousandWords: totalRate,
  };
}

/**
 * Orchestrates a full eval run across all tiers.
 * Stores results as EvalRun records.
 */
export async function runFullEval(
  options: FullEvalOptions
): Promise<FullEvalResult> {
  const text = options.text || "";
  const documentType = options.documentType;

  // Tier 1: Assertions
  const tier1 = await runTier1(text, documentType);

  // Tier 2: Property checks
  const tier2 = runTier2(
    text,
    documentType,
    options.postingVocabulary,
    options.spans
  );

  // Golden packages (optional)
  let golden: GoldenRunResult[] | undefined;
  if (options.goldenPackageIds && options.goldenPackageIds.length > 0) {
    golden = [];
    for (const packageId of options.goldenPackageIds) {
      const result = await runGoldenPackage(packageId);
      golden.push(result);
    }
  }

  // Anchors (optional)
  let anchors: AnchorScoreResult | undefined;
  if (options.anchorTexts && options.anchorTexts.length > 0) {
    const goldenMean = golden
      ? golden.reduce((sum, g) => sum + g.averageEditDistance, 0) /
        golden.length
      : undefined;
    anchors = scoreAnchors(options.anchorTexts, goldenMean);
  }

  // Compute fact score based on assertion pass rate
  const factScore = tier1.results.length > 0
    ? tier1.results.filter((r) => r.passed).length / tier1.results.length
    : 1.0;

  // Compute voice score based on property violations (fewer = better)
  // Normalize: 0 violations = 1.0, threshold of 10 violations/1000 words = 0
  const voiceScore = Math.max(
    0,
    1.0 - tier2.violationsPerThousandWords / 10
  );

  // Store EvalRun
  const assertionResultsData = {
    tier1: tier1.results.map((r) => ({
      assertionId: r.assertionId,
      assertType: r.assertType,
      target: r.target,
      passed: r.passed,
      detail: r.detail || null,
    })),
    violationsPerThousandWords: tier2.violationsPerThousandWords,
    results: tier1.results.map((r) => ({
      assertionId: r.assertionId,
      assertType: r.assertType,
      target: r.target,
      passed: r.passed,
      detail: r.detail || null,
    })),
  };

  const evalRun = await prisma.evalRun.create({
    data: {
      modelId: options.modelId || "gpt-4o-2024-08-06",
      promptVersion: options.promptVersion || "1.0.0",
      temperature: 0.7,
      factScore,
      voiceScore,
      editDistance: golden
        ? golden.reduce((sum, g) => sum + g.averageEditDistance, 0) /
          golden.length
        : null,
      anchorDiscrimination: anchors?.anchorDiscrimination ?? null,
      generatedOutput: text,
      assertionResults: assertionResultsData,
    },
  });

  // Compute metrics from this run
  const metrics = computeMetrics([
    {
      id: evalRun.id,
      factScore,
      voiceScore,
      editDistance: golden
        ? golden.reduce((sum, g) => sum + g.averageEditDistance, 0) /
          golden.length
        : null,
      anchorDiscrimination: anchors?.anchorDiscrimination ?? null,
      assertionResults: assertionResultsData,
    },
  ]);

  // Overall pass: fact must pass. High voice + failing fact = fail.
  const overallPass = tier1.passed && metrics.overallPass;

  return {
    tier1,
    tier2,
    golden,
    anchors,
    metrics,
    evalRunId: evalRun.id,
    overallPass,
  };
}
