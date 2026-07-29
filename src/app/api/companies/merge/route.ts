import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/companies/merge
 *
 * Merges multiple companies into one.
 * Moves all jobs from mergeIds companies to keepId, then deletes the merged companies.
 *
 * Body: { keepId: string, mergeIds: string[] }
 * Returns: { success: true, jobsMoved: number, companiesRemoved: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { keepId, mergeIds } = await request.json();

    if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return NextResponse.json(
        { error: "keepId and mergeIds[] are required" },
        { status: 400 }
      );
    }

    // Verify the keep company exists
    const keepCompany = await prisma.company.findUnique({
      where: { id: keepId },
    });

    if (!keepCompany) {
      return NextResponse.json(
        { error: "Keep company not found" },
        { status: 404 }
      );
    }

    // Move all jobs from mergeIds to keepId using Promise.allSettled
    const movePromises = mergeIds.map(async (mergeId: string) => {
      const jobs = await prisma.job.findMany({
        where: { companyId: mergeId },
        select: { id: true },
      });

      const updatePromises = jobs.map((job) =>
        prisma.job.update({
          where: { id: job.id },
          data: { companyId: keepId, company: keepCompany.name },
        })
      );

      const results = await Promise.allSettled(updatePromises);
      const movedCount = results.filter((r) => r.status === "fulfilled").length;
      return movedCount;
    });

    const moveResults = await Promise.allSettled(movePromises);
    let totalJobsMoved = 0;
    for (const result of moveResults) {
      if (result.status === "fulfilled") {
        totalJobsMoved += result.value;
      }
    }

    // Preserve dream status: if any merged company was a dream company, keep it
    if (!keepCompany.dreamCompany) {
      const mergedCompanies = await prisma.company.findMany({
        where: { id: { in: mergeIds } },
        select: { dreamCompany: true },
      });

      const anyDream = mergedCompanies.some((c) => c.dreamCompany);
      if (anyDream) {
        await prisma.company.update({
          where: { id: keepId },
          data: { dreamCompany: true },
        });
      }
    }

    // Delete the merged companies
    const deletePromises = mergeIds.map((mergeId: string) =>
      prisma.company.delete({ where: { id: mergeId } })
    );

    const deleteResults = await Promise.allSettled(deletePromises);
    const companiesRemoved = deleteResults.filter(
      (r) => r.status === "fulfilled"
    ).length;

    return NextResponse.json({
      success: true,
      jobsMoved: totalJobsMoved,
      companiesRemoved,
    });
  } catch (err) {
    console.error("POST /api/companies/merge error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
