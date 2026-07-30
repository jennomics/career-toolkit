import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/profile/generation-ready - Check if all unresolved items are resolved
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst();

    if (!profile) {
      return NextResponse.json({
        ready: false,
        unresolvedCount: 0,
        totalItems: 0,
      });
    }

    const totalItems = await prisma.unresolvedItem.count({
      where: { profileId: profile.id },
    });

    const unresolvedCount = await prisma.unresolvedItem.count({
      where: {
        profileId: profile.id,
        resolution: null,
      },
    });

    return NextResponse.json({
      ready: totalItems === 0 || unresolvedCount === 0,
      unresolvedCount,
      totalItems,
    });
  } catch (err) {
    console.error("GET /api/profile/generation-ready error:", err);
    return NextResponse.json(
      { error: "Failed to check generation readiness" },
      { status: 500 }
    );
  }
}
