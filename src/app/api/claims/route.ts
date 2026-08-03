import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

const VALID_CATEGORIES = ["numeric", "date", "attribution", "capability", "narrative"];
const VALID_STATUSES = ["verified", "unverified", "superseded"];

// GET /api/claims - List all claims with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const claimKey = searchParams.get("claimKey");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return validationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      where.status = status;
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return validationError(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
      }
      where.category = category;
    }

    if (claimKey) {
      where.claimKey = claimKey;
    }

    const claims = await prisma.claim.findMany({
      where,
      include: {
        artifacts: true,
        negativeAssertions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(claims);
  } catch (err) {
    console.error("GET /api/claims error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/claims - Create a new claim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimKey, statement, category, status } = body;

    if (!claimKey || !statement) {
      return validationError("claimKey and statement are required");
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return validationError(`category is required and must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    const claimStatus = status || "unverified";
    if (!VALID_STATUSES.includes(claimStatus)) {
      return validationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    // Check for conflict: existing active claim with same claimKey (non-superseded)
    const existingClaim = await prisma.claim.findFirst({
      where: {
        claimKey,
        status: { not: "superseded" },
      },
    });

    if (existingClaim) {
      const requestId = generateRequestId();
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: `A claim with claimKey "${claimKey}" already exists with status "${existingClaim.status}". Resolve the conflict before creating a new claim.`,
            requestId,
          },
          existingClaim,
          attemptedClaim: { claimKey, statement, category, status: claimStatus },
        },
        { status: 409 }
      );
    }

    const claim = await prisma.claim.create({
      data: {
        claimKey,
        statement,
        category,
        status: claimStatus,
      },
      include: {
        artifacts: true,
        negativeAssertions: true,
      },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (err) {
    console.error("POST /api/claims error:", err);
    // Catch Prisma unique constraint violation (race condition on concurrent create)
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      const requestId = generateRequestId();
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: `A claim with this claimKey and status already exists (unique constraint violation).`,
            requestId,
          },
        },
        { status: 409 }
      );
    }
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
