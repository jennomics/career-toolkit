import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/jobs/merge
 *
 * Keeps one job and deletes the others.
 * Skills and responsibilities cascade on delete.
 *
 * Body: { keepId: string, deleteIds: string[] }
 * Returns: { success: true, deleted: number, kept: { id, title, company } }
 */
export async function POST(request: NextRequest) {
  try {
    const { keepId, deleteIds } = await request.json();

    if (!keepId || !deleteIds || !Array.isArray(deleteIds) || deleteIds.length === 0) {
      return NextResponse.json(
        { error: "keepId and deleteIds[] are required" },
        { status: 400 }
      );
    }

    // Verify the keep job exists
    const keepJob = await prisma.job.findUnique({
      where: { id: keepId },
      select: { id: true, title: true, company: true },
    });

    if (!keepJob) {
      return NextResponse.json(
        { error: "Keep job not found" },
        { status: 404 }
      );
    }

    // Delete the duplicate jobs (skills/responsibilities cascade via onDelete: Cascade)
    const deletePromises = deleteIds.map((id: string) =>
      prisma.job.delete({ where: { id } })
    );

    const results = await Promise.allSettled(deletePromises);
    const deleted = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({
      success: true,
      deleted,
      kept: {
        id: keepJob.id,
        title: keepJob.title,
        company: keepJob.company,
      },
    });
  } catch (err) {
    console.error("POST /api/jobs/merge error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
