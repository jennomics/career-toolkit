import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";
import { PIPELINE_STAGES, computeConversionRates } from "@/lib/tracker-helpers";

// GET /api/tracker/analytics - Funnel metrics, time-in-stage, conversion rates
export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    });

    const events = await prisma.applicationEvent.findMany({
      where: { eventType: "status_change" },
      orderBy: { occurredAt: "asc" },
    });

    // Count jobs per stage
    const stageCounts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) {
      stageCounts[stage] = 0;
    }
    for (const job of jobs) {
      const status = job.status || "saved";
      stageCounts[status] = (stageCounts[status] || 0) + 1;
    }

    // Compute average time in stage from events
    const timeInStage: Record<string, { totalMs: number; count: number }> = {};
    // Group events by job
    const eventsByJob: Record<string, typeof events> = {};
    for (const evt of events) {
      if (!eventsByJob[evt.jobId]) eventsByJob[evt.jobId] = [];
      eventsByJob[evt.jobId].push(evt);
    }

    // Build a map of jobId -> current status for time-in-stage current stage calculation
    const jobStatusMap: Record<string, string> = {};
    for (const job of jobs) {
      jobStatusMap[job.id] = job.status || "saved";
    }

    const now = new Date();

    for (const [jobId, jobEvents] of Object.entries(eventsByJob)) {
      for (let i = 0; i < jobEvents.length - 1; i++) {
        const fromStatus = jobEvents[i].toStatus;
        if (!fromStatus) continue;
        const duration = new Date(jobEvents[i + 1].occurredAt).getTime() - new Date(jobEvents[i].occurredAt).getTime();
        if (!timeInStage[fromStatus]) timeInStage[fromStatus] = { totalMs: 0, count: 0 };
        timeInStage[fromStatus].totalMs += duration;
        timeInStage[fromStatus].count += 1;
      }

      // Fix: account for current stage duration.
      // If the last event's toStatus matches the job's current status,
      // compute duration from that event's occurredAt to now.
      const lastEvent = jobEvents[jobEvents.length - 1];
      const currentStatus = jobStatusMap[jobId];
      if (lastEvent && lastEvent.toStatus === currentStatus) {
        const currentStageDuration = now.getTime() - new Date(lastEvent.occurredAt).getTime();
        if (!timeInStage[currentStatus]) timeInStage[currentStatus] = { totalMs: 0, count: 0 };
        timeInStage[currentStatus].totalMs += currentStageDuration;
        timeInStage[currentStatus].count += 1;
      }
    }

    const avgTimeInStage: Record<string, number> = {};
    for (const [stage, data] of Object.entries(timeInStage)) {
      avgTimeInStage[stage] = data.count > 0 ? Math.round(data.totalMs / data.count / (1000 * 60 * 60 * 24)) : 0; // days
    }

    // Conversion rates
    const conversionRates = computeConversionRates(
      stageCounts,
      events.map((e) => ({ jobId: e.jobId, toStatus: e.toStatus }))
    );

    return NextResponse.json({
      totalJobs: jobs.length,
      stageCounts,
      avgTimeInStageDays: avgTimeInStage,
      conversionRates,
    });
  } catch (err) {
    console.error("GET /api/tracker/analytics error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
