/**
 * Tracker utility functions for pipeline stage grouping, attention detection, and analytics.
 */

/** Ordered list of pipeline stages (enhanced vocabulary) */
export const PIPELINE_STAGES = [
  "saved",
  "researching",
  "applied",
  "screening",
  "interviewing",
  "final-round",
  "offer",
  "negotiating",
  "accepted",
  "rejected",
  "withdrawn",
  "closed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Statuses considered "archived" (no longer active) */
export const ARCHIVED_STATUSES: PipelineStage[] = ["rejected", "withdrawn", "closed", "accepted"];

/** Statuses considered "active" (requiring attention) */
export const ACTIVE_STATUSES: PipelineStage[] = PIPELINE_STAGES.filter(
  (s) => !ARCHIVED_STATUSES.includes(s)
) as unknown as PipelineStage[];

/** Stale threshold in days */
export const STALE_THRESHOLD_DAYS = 14;

/**
 * Groups jobs by their status/stage for pipeline view.
 * Returns a record where keys are stage names and values are arrays of jobs.
 */
export function groupJobsByStage<T extends { status: string }>(
  jobs: T[]
): Record<string, { jobs: T[]; count: number }> {
  const pipeline: Record<string, { jobs: T[]; count: number }> = {};

  for (const stage of PIPELINE_STAGES) {
    pipeline[stage] = { jobs: [], count: 0 };
  }

  for (const job of jobs) {
    const stage = job.status || "saved";
    if (pipeline[stage]) {
      pipeline[stage].jobs.push(job);
      pipeline[stage].count += 1;
    } else {
      // Unknown status - put into "saved" as fallback
      pipeline["saved"].jobs.push(job);
      pipeline["saved"].count += 1;
    }
  }

  return pipeline;
}

/**
 * Finds active applications that have not been updated in more than STALE_THRESHOLD_DAYS.
 */
export function findStaleApplications<T extends { id: string; updatedAt: Date | string }>(
  activeJobs: T[],
  now: Date = new Date()
): (T & { daysSinceUpdate: number })[] {
  const thresholdMs = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const stale: (T & { daysSinceUpdate: number })[] = [];

  for (const job of activeJobs) {
    const updatedAt = new Date(job.updatedAt);
    const elapsed = now.getTime() - updatedAt.getTime();
    if (elapsed > thresholdMs) {
      stale.push({
        ...job,
        daysSinceUpdate: Math.floor(elapsed / (24 * 60 * 60 * 1000)),
      });
    }
  }

  // Sort by most stale first
  stale.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  return stale;
}

/**
 * Computes conversion rates between adjacent pipeline stages.
 * Returns the percentage of jobs that moved from one stage to the next.
 */
export function computeConversionRates(
  stageCounts: Record<string, number>
): { from: string; to: string; rate: number }[] {
  const rates: { from: string; to: string; rate: number }[] = [];

  // Only compute for active stages in order
  const activeOrder: PipelineStage[] = [
    "saved",
    "researching",
    "applied",
    "screening",
    "interviewing",
    "final-round",
    "offer",
    "negotiating",
    "accepted",
  ];

  for (let i = 0; i < activeOrder.length - 1; i++) {
    const fromStage = activeOrder[i];
    const toStage = activeOrder[i + 1];
    // Count = jobs that are at toStage or beyond
    const fromCount = activeOrder
      .slice(i)
      .reduce((sum, s) => sum + (stageCounts[s] || 0), 0);
    const toCount = activeOrder
      .slice(i + 1)
      .reduce((sum, s) => sum + (stageCounts[s] || 0), 0);

    const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
    rates.push({ from: fromStage, to: toStage, rate });
  }

  return rates;
}
