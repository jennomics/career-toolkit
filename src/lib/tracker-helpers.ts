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
 *
 * When events are provided, computes from event history (accurate funnel):
 *   For each stage transition (A→B), rate = (jobs that ever reached B) / (jobs that ever reached A) * 100
 *   This correctly accounts for rejected/withdrawn applications in the denominator.
 *   A job at a later stage implicitly reached all earlier stages.
 *
 * When events are not provided (backward-compat fallback), uses snapshot-based approach
 * but includes all terminal statuses (rejected/withdrawn/closed) in denominators.
 */
export function computeConversionRates(
  stageCounts: Record<string, number>,
  events?: Array<{ jobId: string; toStatus: string | null }>
): { from: string; to: string; rate: number }[] {
  const rates: { from: string; to: string; rate: number }[] = [];

  // Ordered list of active (non-terminal) stages for funnel computation
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

  if (events && events.length > 0) {
    // Event-based computation: count distinct jobIds that ever reached each stage.
    // A job's presence at a later stage implies it passed through all earlier stages.

    // Build a map: jobId -> set of stages ever reached (from events)
    const jobStages = new Map<string, Set<string>>();
    for (const evt of events) {
      if (!evt.toStatus) continue;
      if (!jobStages.has(evt.jobId)) {
        jobStages.set(evt.jobId, new Set());
      }
      jobStages.get(evt.jobId)!.add(evt.toStatus);
    }

    // For each job, propagate implicit earlier-stage presence.
    // If a job has a toStatus of "interviewing", it implicitly reached all earlier stages.
    for (const [, stages] of jobStages) {
      const stagesArray = Array.from(stages);
      for (const stage of stagesArray) {
        const stageIdx = activeOrder.indexOf(stage as PipelineStage);
        if (stageIdx === -1) continue;
        // Mark all preceding active stages as reached implicitly
        for (let k = 0; k < stageIdx; k++) {
          stages.add(activeOrder[k]);
        }
      }
    }

    // Count jobs that ever reached each stage
    const reachedCount: Record<string, number> = {};
    for (const stage of activeOrder) {
      reachedCount[stage] = 0;
    }
    for (const [, stages] of jobStages) {
      for (const stage of stages) {
        if (reachedCount[stage] !== undefined) {
          reachedCount[stage] += 1;
        }
      }
    }

    // Also count jobs that are currently at a stage (may not have a toStatus event yet)
    // by incorporating stageCounts for any stage not captured in events
    for (const stage of activeOrder) {
      const fromEvents = reachedCount[stage];
      const fromSnapshot = stageCounts[stage] || 0;
      if (fromSnapshot > fromEvents) {
        reachedCount[stage] = fromSnapshot;
      }
    }

    for (let i = 0; i < activeOrder.length - 1; i++) {
      const fromStage = activeOrder[i];
      const toStage = activeOrder[i + 1];
      const fromCount = reachedCount[fromStage];
      const toCount = reachedCount[toStage];
      const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
      rates.push({ from: fromStage, to: toStage, rate });
    }

    return rates;
  }

  // Fallback: snapshot-based approach, including terminal statuses in denominators.
  // All stages (including rejected/withdrawn/closed) contribute to the "from" denominator
  // at the earliest stage they could have reached.
  const terminalStatuses = ["rejected", "withdrawn", "closed"];

  // Build an augmented count that adds terminal jobs back into their last-known active stage.
  // Since we don't have events in fallback mode, we add terminal counts to the "applied" bucket
  // as a reasonable approximation (they at least reached the pipeline).
  //
  // KNOWN LIMITATION: This is a lossy heuristic. A job rejected at "final-round" gets counted
  // as if it only reached "applied", which inflates the "applied" denominator and deflates
  // early-stage conversion rates while understating late-stage drop-off. Once event history
  // accumulates (via the event-based path above), this fallback is no longer used. The
  // event-based path correctly propagates implicit stage reachability backward.
  const augmented = { ...stageCounts };
  for (const t of terminalStatuses) {
    if (augmented[t]) {
      augmented["applied"] = (augmented["applied"] || 0) + augmented[t];
    }
  }

  for (let i = 0; i < activeOrder.length - 1; i++) {
    const fromStage = activeOrder[i];
    const toStage = activeOrder[i + 1];
    const fromCount = activeOrder
      .slice(i)
      .reduce((sum, s) => sum + (augmented[s] || 0), 0);
    const toCount = activeOrder
      .slice(i + 1)
      .reduce((sum, s) => sum + (augmented[s] || 0), 0);

    const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
    rates.push({ from: fromStage, to: toStage, rate });
  }

  return rates;
}
