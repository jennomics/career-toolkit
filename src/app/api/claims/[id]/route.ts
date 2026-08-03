import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

const VALID_CATEGORIES = ["numeric", "date", "attribution", "capability", "narrative"];
const VALID_STATUSES = ["verified", "unverified", "superseded"];

// GET /api/claims/[id] - Get a single claim with all relations
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        artifacts: true,
        negativeAssertions: true,
        corrections: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!claim) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    return NextResponse.json(claim);
  } catch (err) {
    console.error("GET /api/claims/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PATCH /api/claims/[id] - Update a claim's status or category
// Note: statement changes must go through POST /api/claims/[id]/correct
// to maintain the correction audit trail and create negative assertions.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { statement, status, category } = body;

    // Reject statement changes - these must use the /correct endpoint
    if (statement !== undefined) {
      return validationError(
        "Statement changes are not allowed via PATCH. Use POST /api/claims/[id]/correct to update a claim's statement with a full correction audit trail."
      );
    }

    // Validate that the claim exists
    const existing = await prisma.claim.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return validationError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return validationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (status !== undefined) data.status = status;
    if (category !== undefined) data.category = category;

    if (Object.keys(data).length === 0) {
      return validationError("At least one field (status, category) must be provided");
    }

    const claim = await prisma.claim.update({
      where: { id },
      data,
      include: {
        artifacts: true,
        negativeAssertions: true,
        corrections: { orderBy: { createdAt: "desc" } },
      },
    });

    return NextResponse.json(claim);
  } catch (err) {
    console.error("PATCH /api/claims/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/claims/[id] - Soft-delete by setting status to "superseded"
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.claim.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    const claim = await prisma.claim.update({
      where: { id },
      data: { status: "superseded" },
    });

    return NextResponse.json(claim);
  } catch (err) {
    console.error("DELETE /api/claims/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
