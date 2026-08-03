import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

// GET /api/claims/[id]/artifacts - List artifacts for a claim
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

    const artifacts = await prisma.claimArtifact.findMany({
      where: { claimId: id },
      orderBy: { ingestionDate: "desc" },
    });

    return NextResponse.json(artifacts);
  } catch (err) {
    console.error("GET /api/claims/[id]/artifacts error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/claims/[id]/artifacts - Create an artifact (evidence) for a claim
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { passageText, passageLocation, freshnessWindow } = body;

    if (!passageText) {
      return validationError("passageText is required");
    }

    const claim = await prisma.claim.findUnique({ where: { id } });
    if (!claim) {
      return notFoundError(`Claim with id "${id}" not found`);
    }

    const artifact = await prisma.claimArtifact.create({
      data: {
        claimId: id,
        passageText,
        passageLocation: passageLocation || null,
        freshnessWindow: freshnessWindow != null ? Number(freshnessWindow) : null,
      },
    });

    return NextResponse.json(artifact, { status: 201 });
  } catch (err) {
    console.error("POST /api/claims/[id]/artifacts error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
