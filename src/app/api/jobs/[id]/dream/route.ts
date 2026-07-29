import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/jobs/:id/dream - Toggle dream company/job status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dreamCompany, dreamJob } = body;

    // Build update data for the job
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (dreamCompany !== undefined) updateData.dreamCompany = dreamCompany;
    if (dreamJob !== undefined) updateData.dreamJob = dreamJob;

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: { skills: true, responsibilities: true },
    });

    // If dreamCompany changed, propagate to the linked Company record
    if (dreamCompany !== undefined && job.companyId) {
      if (dreamCompany) {
        // Setting dreamCompany=true on a job -> set Company.dreamCompany=true
        await prisma.company.update({
          where: { id: job.companyId },
          data: { dreamCompany: true },
        });
      } else {
        // Setting dreamCompany=false on a job -> check if any OTHER jobs for that company still have dreamCompany=true
        const otherDreamJobs = await prisma.job.count({
          where: {
            companyId: job.companyId,
            dreamCompany: true,
            id: { not: id },
          },
        });
        if (otherDreamJobs === 0) {
          await prisma.company.update({
            where: { id: job.companyId },
            data: { dreamCompany: false },
          });
        }
      }
    }

    return NextResponse.json(job);
  } catch (err) {
    console.error("PATCH /api/jobs/[id]/dream error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
