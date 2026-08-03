import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

// GET /api/claims/[id]/negative-assertions - List negative assertions for a claim
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    const assertions = await prisma.negativeAssertion.findMany({
      where: { claimId: id },
      orderBy: { correctedAt: "desc" },
    });

    return NextResponse.json(assertions);
  } catch (err) {
    console.error("GET /api/claims/[id]/negative-assertions error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/claims/[id]/negative-assertions - Manually add a negative assertion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { forbiddenText, reason } = body;

    if (!forbiddenText || !reason) {
      return validationError("forbiddenText and reason are required");
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    const assertion = await prisma.negativeAssertion.create({
      data: {
        claimId: id,
        forbiddenText,
        reason,
      },
    });

    return NextResponse.json(assertion, { status: 201 });
  } catch (err) {
    console.error("POST /api/claims/[id]/negative-assertions error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
