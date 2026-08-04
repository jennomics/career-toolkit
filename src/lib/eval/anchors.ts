/**
 * Known-Bad Anchor Scoring
 *
 * Runs Tier 2 property checks on known-bad anchor texts.
 * If any anchor passes (has fewer than threshold violations), the harness is broken.
 * Computes anchor discrimination (gap between golden mean and anchor mean).
 */

import {
  contractionRate,
  ruleOfThreeDetector,
  landingDetector,
  intraDocRepetition,
  comprehensionFlag,
  type PropertyResult,
} from "./properties";

export interface AnchorScoreResult {
  broken: boolean;
  anchorResults: Array<{
    text: string;
    totalViolations: number;
    violationsPerThousandWords: number;
  }>;
  anchorMeanViolations: number;
  anchorDiscrimination?: number;
}

// Minimum violations per 1000 words for an anchor text to be considered "bad enough"
const ANCHOR_THRESHOLD = 2.0;

/**
 * Scores known-bad anchor texts using Tier 2 property checks.
 * All anchors should score BELOW passing threshold (i.e., high violations).
 * If any anchor passes, the harness is broken.
 */
export function scoreAnchors(
  anchorTexts: string[],
  goldenMeanViolations?: number
): AnchorScoreResult {
  const anchorResults: Array<{
    text: string;
    totalViolations: number;
    violationsPerThousandWords: number;
  }> = [];

  for (const text of anchorTexts) {
    const results = runPropertyChecksOnText(text);
    const totalViolations = results.reduce(
      (sum, r) => sum + r.violations.length,
      0
    );
    const totalRate = results.reduce(
      (sum, r) => sum + r.violationsPerThousandWords,
      0
    );

    anchorResults.push({
      text: text.substring(0, 100),
      totalViolations,
      violationsPerThousandWords: totalRate,
    });
  }

  // Check if any anchor passes (has fewer violations than threshold)
  const broken = anchorResults.some(
    (r) => r.violationsPerThousandWords < ANCHOR_THRESHOLD
  );

  const anchorMeanViolations =
    anchorResults.length > 0
      ? anchorResults.reduce((sum, r) => sum + r.violationsPerThousandWords, 0) /
        anchorResults.length
      : 0;

  // Compute anchor discrimination if golden mean is provided
  const anchorDiscrimination =
    goldenMeanViolations !== undefined
      ? anchorMeanViolations - goldenMeanViolations
      : undefined;

  return {
    broken,
    anchorResults,
    anchorMeanViolations,
    anchorDiscrimination,
  };
}

/**
 * Runs all property checks on a text and returns combined results.
 */
function runPropertyChecksOnText(text: string): PropertyResult[] {
  return [
    contractionRate(text),
    ruleOfThreeDetector(text),
    landingDetector(text),
    intraDocRepetition(text),
    comprehensionFlag(text),
  ];
}
