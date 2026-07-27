import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/migrate/export
 *
 * Exports all data from the LOCAL database as JSON.
 * Hit this on localhost:3000 to get your SQLite data,
 * then POST it to the production /api/migrate endpoint.
 *
 * Only works in development for safety.
 */
export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");

    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "asc" },
    });
    const skills = await prisma.jobSkill.findMany();
    const responsibilities = await prisma.jobResponsibility.findMany();
    const corrections = await prisma.correction.findMany();

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      counts: {
        jobs: jobs.length,
        skills: skills.length,
        responsibilities: responsibilities.length,
        corrections: corrections.length,
      },
      jobs,
      skills,
      responsibilities,
      corrections,
    });
  } catch (error) {
    console.error("[migrate/export] Failed:", error);
    return NextResponse.json(
      {
        error: "Export failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
