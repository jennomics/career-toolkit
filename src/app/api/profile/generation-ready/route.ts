import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

// GET /api/profile/generation-ready - Check if profile is ready for resume generation
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst({
      include: {
        careerRoles: true,
        signatureStories: true,
        profileMetrics: true,
        unresolvedItems: true,
        writingSamples: true,
      },
    });

    if (!profile) {
      return NextResponse.json({
        ready: false,
        unresolvedCount: 0,
        totalItems: 0,
      });
    }

    const unresolvedCount = profile.unresolvedItems.filter(
      (item) => !item.resolution
    ).length;

    const totalItems =
      profile.careerRoles.length +
      profile.signatureStories.length +
      profile.profileMetrics.length +
      profile.writingSamples.length +
      (profile.positioningStatements.length > 0 ? 1 : 0) +
      (profile.selfDescribedStrengths.length > 0 ? 1 : 0) +
      (profile.operatingPrinciples.length > 0 ? 1 : 0);

    const ready = totalItems > 0 && unresolvedCount === 0;

    return NextResponse.json({
      ready,
      unresolvedCount,
      totalItems,
    });
  } catch (err) {
    console.error("GET /api/profile/generation-ready error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
