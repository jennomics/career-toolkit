import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";
import { findStaleApplications } from "@/lib/tracker-helpers";

// GET /api/tracker/attention - Items needing action
export async function GET() {
  try {
    const now = new Date();

    // Overdue follow-ups (not completed, dueDate < now)
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        completedAt: null,
        dueDate: { lt: now },
      },
      include: { job: { select: { id: true, title: true, company: true } } },
      orderBy: { dueDate: "asc" },
    });

    // Upcoming follow-ups (due in next 3 days)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingFollowUps = await prisma.followUp.findMany({
      where: {
        completedAt: null,
        dueDate: { gte: now, lte: threeDaysFromNow },
      },
      include: { job: { select: { id: true, title: true, company: true } } },
      orderBy: { dueDate: "asc" },
    });

    // Stale applications: active jobs with no events in >14 days
    const activeStatuses = ["applied", "screening", "interviewing", "final-round", "offer", "negotiating"];
    const activeJobs = await prisma.job.findMany({
      where: { status: { in: activeStatuses } },
      select: { id: true, title: true, company: true, status: true, updatedAt: true },
    });

    const staleApplications = findStaleApplications(activeJobs, now);

    return NextResponse.json({
      overdueFollowUps,
      upcomingFollowUps,
      staleApplications,
      attentionCount: overdueFollowUps.length + staleApplications.length,
    });
  } catch (err) {
    console.error("GET /api/tracker/attention error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
