import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

// POST /api/claims/[id]/correct - Atomically correct a claim
// Creates a ClaimCorrection record, updates the claim statement, creates a NegativeAssertion
// Idempotent: if the claim already has correctedValue as its statement, returns without duplicating
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { previousValue, correctedValue, source } = body;

    if (!previousValue || !correctedValue) {
      return validationError("previousValue and correctedValue are required");
    }

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { corrections: true, negativeAssertions: true },
    });

    if (!claim) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    // Idempotency: if the claim already has the correctedValue as statement, return success
    if (claim.statement === correctedValue) {
      // Check if the correction and negative assertion already exist
      const existingCorrection = claim.corrections.find(
        (c) => c.previousValue === previousValue && c.correctedValue === correctedValue
      );
      const existingAssertion = claim.negativeAssertions.find(
        (a) => a.forbiddenText === previousValue
      );

      if (existingCorrection && existingAssertion) {
        return NextResponse.json({
          claim,
          correction: existingCorrection,
          negativeAssertion: existingAssertion,
          idempotent: true,
        });
      }
    }

    const correctionSource = source || "user-ui";

    // All three writes are wrapped in an interactive transaction for atomicity.
    // If any step fails, all changes are rolled back.
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Update the claim statement
      const updatedClaim = await tx.claim.update({
        where: { id },
        data: { statement: correctedValue },
      });

      // Step 2: Create a ClaimCorrection record
      const correction = await tx.claimCorrection.create({
        data: {
          claimId: id,
          previousValue,
          correctedValue,
          source: correctionSource,
        },
      });

      // Step 3: Create a NegativeAssertion for the old value
      const negativeAssertion = await tx.negativeAssertion.create({
        data: {
          claimId: id,
          forbiddenText: previousValue,
          reason: `Corrected from "${previousValue}" to "${correctedValue}"`,
        },
      });

      return { claim: updatedClaim, correction, negativeAssertion };
    });

    return NextResponse.json({
      ...result,
      idempotent: false,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/claims/[id]/correct error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
