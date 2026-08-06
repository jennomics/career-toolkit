/**
 * Tier 1 Eval Assertion Runner
 *
 * Loads active EvalAssertion records from the database and runs
 * contains/not-contains checks against provided text.
 * Used in the eval harness (separate from inline deterministic checks).
 */

import { prisma } from "@/lib/db";

export interface AssertionResult {
  assertionId: string;
  assertType: string;
  target: string;
  passed: boolean;
  detail?: string;
}

export interface Tier1Result {
  passed: boolean;
  results: AssertionResult[];
}

/**
 * Runs all active Tier 1 EvalAssertions against the given text.
 * Filters by documentTypes: assertions with empty documentTypes array apply to all.
 */
export async function runTier1Assertions(
  text: string,
  documentType?: string
): Promise<Tier1Result> {
  const assertions = await prisma.evalAssertion.findMany({
    where: {
      tier: 1,
      active: true,
    },
  });

  const results: AssertionResult[] = [];

  for (const assertion of assertions) {
    // Filter by documentTypes: empty array means applies to all.
    // When documentType is undefined/null and assertion has specific documentTypes, skip it.
    if (assertion.documentTypes.length > 0) {
      if (!documentType || !assertion.documentTypes.includes(documentType)) {
        continue;
      }
    }

    const lowerText = text.toLowerCase();
    const lowerTarget = assertion.target.toLowerCase();
    let passed: boolean;
    let detail: string | undefined;

    switch (assertion.assertType) {
      case "contains":
        passed = lowerText.includes(lowerTarget);
        if (!passed) {
          detail = `Expected text to contain "${assertion.target}" but it was not found`;
        }
        break;
      case "not-contains":
        passed = !lowerText.includes(lowerTarget);
        if (!passed) {
          detail = `Text must not contain "${assertion.target}" but it was found`;
        }
        break;
      default:
        // Property type assertions are handled in Tier 2
        passed = true;
        break;
    }

    results.push({
      assertionId: assertion.id,
      assertType: assertion.assertType,
      target: assertion.target,
      passed,
      detail,
    });
  }

  const allPassed = results.every((r) => r.passed);

  return {
    passed: allPassed,
    results,
  };
}
