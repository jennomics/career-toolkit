import { describe, it, expect } from "vitest";
import {
  computeConversionRates,
  findStaleApplications,
  groupJobsByStage,
  PIPELINE_STAGES,
  STALE_THRESHOLD_DAYS,
} from "../tracker-helpers";

describe("Analytics: Conversion Rate Calculation", () => {
  it("computes correct conversion rate when all jobs are at one stage", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["saved"] = 10;

    const rates = computeConversionRates(stageCounts);
    // From saved onward, only saved has 10 jobs, nothing beyond
    expect(rates[0].from).toBe("saved");
    expect(rates[0].to).toBe("researching");
    expect(rates[0].rate).toBe(0);
  });

  it("computes 100% when all jobs have progressed to accepted (no rejected)", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["accepted"] = 5;

    const rates = computeConversionRates(stageCounts);
    // Since all 5 jobs are at accepted (the last active stage),
    // every stage-to-stage conversion should be 100%
    for (const r of rates) {
      expect(r.rate).toBe(100);
    }
  });

  it("rejected jobs reduce conversion rates in fallback (snapshot) mode", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["accepted"] = 5;
    stageCounts["rejected"] = 5; // 5 rejected jobs should inflate the denominator

    const rates = computeConversionRates(stageCounts);
    // In fallback mode, rejected jobs are added to the "applied" denominator.
    // applied stage now has 5 extra. accepted is at position 8, applied at position 2.
    // The saved->researching rate: fromCount = sum from saved onwards in augmented
    // augmented applied = 0 + 5 = 5, saved=0, researching=0, screening=0, etc., accepted=5
    // fromCount (saved onwards) = 5(applied) + 5(accepted) = 10, toCount (researching onwards) = 5 + 5 = 10
    // Actually: saved=0, researching=0, applied=5, screening=0, interviewing=0, final-round=0, offer=0, negotiating=0, accepted=5
    // saved->researching: from = 0+0+5+0+0+0+0+0+5=10, to = 0+5+0+0+0+0+0+5=10, rate=100%
    // applied->screening: from = 5+0+0+0+0+0+5 = 10, to = 0+0+0+0+0+5 = 5, rate = 50%
    const appliedToScreening = rates.find((r) => r.from === "applied" && r.to === "screening");
    expect(appliedToScreening).toBeDefined();
    expect(appliedToScreening!.rate).toBe(50);
  });

  it("computes intermediate conversion rates correctly", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["saved"] = 5;
    stageCounts["applied"] = 3;
    stageCounts["interviewing"] = 2;

    const rates = computeConversionRates(stageCounts);
    // saved -> researching: fromCount = 5+0+3+0+2+0+0+0+0 = 10, toCount = 0+3+0+2+0+0+0+0 = 5, rate = 50%
    expect(rates[0].rate).toBe(50);
  });

  it("handles all zero counts gracefully", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;

    const rates = computeConversionRates(stageCounts);
    expect(rates.length).toBe(8); // 9 active stages - 1 = 8 transitions
    for (const r of rates) {
      expect(r.rate).toBe(0);
    }
  });

  it("returns rates ordered from first to last stage", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 1;

    const rates = computeConversionRates(stageCounts);
    const expectedOrder = [
      ["saved", "researching"],
      ["researching", "applied"],
      ["applied", "screening"],
      ["screening", "interviewing"],
      ["interviewing", "final-round"],
      ["final-round", "offer"],
      ["offer", "negotiating"],
      ["negotiating", "accepted"],
    ];
    for (let i = 0; i < expectedOrder.length; i++) {
      expect(rates[i].from).toBe(expectedOrder[i][0]);
      expect(rates[i].to).toBe(expectedOrder[i][1]);
    }
  });
});

describe("Analytics: Event-Based Conversion Rate Calculation", () => {
  it("computes conversion rates from event history", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;

    const events = [
      { jobId: "job1", toStatus: "applied" },
      { jobId: "job1", toStatus: "screening" },
      { jobId: "job1", toStatus: "interviewing" },
      { jobId: "job2", toStatus: "applied" },
      { jobId: "job2", toStatus: "screening" },
      { jobId: "job3", toStatus: "applied" },
    ];

    const rates = computeConversionRates(stageCounts, events);

    // All 3 jobs reached "applied" (job3 explicitly, job1 and job2 also via events)
    // Implicit stage propagation:
    //   job1 reached: saved, researching, applied, screening, interviewing
    //   job2 reached: saved, researching, applied, screening
    //   job3 reached: saved, researching, applied
    // saved: 3, researching: 3, applied: 3, screening: 2, interviewing: 1
    const savedToResearching = rates.find((r) => r.from === "saved");
    expect(savedToResearching!.rate).toBe(100); // 3/3

    const appliedToScreening = rates.find((r) => r.from === "applied");
    expect(appliedToScreening!.rate).toBe(67); // 2/3 rounded

    const screeningToInterviewing = rates.find((r) => r.from === "screening");
    expect(screeningToInterviewing!.rate).toBe(50); // 1/2
  });

  it("includes rejected jobs in denominator via event history", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["interviewing"] = 1;
    stageCounts["rejected"] = 2;

    // Events show job2 and job3 reached "applied" then got rejected
    const events = [
      { jobId: "job1", toStatus: "applied" },
      { jobId: "job1", toStatus: "screening" },
      { jobId: "job1", toStatus: "interviewing" },
      { jobId: "job2", toStatus: "applied" },
      { jobId: "job2", toStatus: "rejected" },
      { jobId: "job3", toStatus: "applied" },
      { jobId: "job3", toStatus: "screening" },
      { jobId: "job3", toStatus: "rejected" },
    ];

    const rates = computeConversionRates(stageCounts, events);

    // job1 reached: saved, researching, applied, screening, interviewing
    // job2 reached: saved, researching, applied (then rejected - terminal, not in activeOrder)
    // job3 reached: saved, researching, applied, screening (then rejected)
    // applied: 3 jobs reached it, screening: 2 (job1, job3), interviewing: 1 (job1)
    const appliedToScreening = rates.find((r) => r.from === "applied");
    expect(appliedToScreening!.rate).toBe(67); // 2/3 rounded

    const screeningToInterviewing = rates.find((r) => r.from === "screening");
    expect(screeningToInterviewing!.rate).toBe(50); // 1/2
  });

  it("event-based rates drop below 100% when rejected jobs are added", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["accepted"] = 5;
    stageCounts["rejected"] = 3;

    // 5 jobs made it all the way to accepted, 3 got rejected at applied stage
    const events = [
      { jobId: "job1", toStatus: "accepted" },
      { jobId: "job2", toStatus: "accepted" },
      { jobId: "job3", toStatus: "accepted" },
      { jobId: "job4", toStatus: "accepted" },
      { jobId: "job5", toStatus: "accepted" },
      { jobId: "job6", toStatus: "applied" },
      { jobId: "job6", toStatus: "rejected" },
      { jobId: "job7", toStatus: "applied" },
      { jobId: "job7", toStatus: "rejected" },
      { jobId: "job8", toStatus: "applied" },
      { jobId: "job8", toStatus: "rejected" },
    ];

    const rates = computeConversionRates(stageCounts, events);

    // All 8 jobs implicitly reached saved and researching (via applied or accepted)
    // applied: 8 jobs reached it (5 via accepted implicit, 3 explicitly)
    // screening onwards: only the 5 accepted jobs reached those stages
    // saved->researching: 8/8 = 100%
    // researching->applied: 8/8 = 100%
    // applied->screening: 5/8 = 63%
    const appliedToScreening = rates.find((r) => r.from === "applied");
    expect(appliedToScreening!.rate).toBe(63); // 5/8 rounded

    // All later stages should be 100% among the 5 that made it past applied
    const screeningToInterviewing = rates.find((r) => r.from === "screening");
    expect(screeningToInterviewing!.rate).toBe(100);
  });

  it("handles empty events gracefully (falls back to snapshot)", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["applied"] = 5;
    stageCounts["interviewing"] = 3;

    const rates = computeConversionRates(stageCounts, []);
    // Empty events array should fall back to snapshot mode
    // applied onwards: 5+3=8 from applied, 3 from screening onwards
    const savedToResearching = rates.find((r) => r.from === "saved");
    expect(savedToResearching!.rate).toBe(100); // 8/8
  });
});

describe("Analytics: Time-in-Stage Averaging", () => {
  it("identifies stale jobs at exactly the threshold boundary", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    // Exactly at threshold - should NOT be stale
    const exactlyAtThreshold = new Date(
      now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
    );
    // 1ms past threshold - SHOULD be stale
    const pastThreshold = new Date(
      now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000 - 1
    );

    const jobs = [
      { id: "at-boundary", updatedAt: exactlyAtThreshold },
      { id: "past-boundary", updatedAt: pastThreshold },
    ];

    const result = findStaleApplications(jobs, now);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("past-boundary");
  });

  it("calculates daysSinceUpdate accurately", () => {
    const now = new Date("2024-06-15T00:00:00Z");
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const result = findStaleApplications(
      [{ id: "1", updatedAt: twentyDaysAgo }],
      now
    );
    expect(result[0].daysSinceUpdate).toBe(20);
  });
});

describe("Analytics: Attention Item Detection", () => {
  it("findStaleApplications handles string date format", () => {
    const now = new Date("2024-06-15T00:00:00Z");
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const jobs = [
      { id: "1", updatedAt: thirtyDaysAgo.toISOString() },
    ];

    const result = findStaleApplications(jobs, now);
    expect(result).toHaveLength(1);
    expect(result[0].daysSinceUpdate).toBe(30);
  });

  it("findStaleApplications handles Date objects", () => {
    const now = new Date("2024-06-15T00:00:00Z");
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const jobs = [
      { id: "1", updatedAt: thirtyDaysAgo },
    ];

    const result = findStaleApplications(jobs, now);
    expect(result).toHaveLength(1);
  });

  it("groupJobsByStage produces correct counts for attention analysis", () => {
    const jobs = [
      { id: "1", status: "applied" },
      { id: "2", status: "applied" },
      { id: "3", status: "interviewing" },
      { id: "4", status: "rejected" },
      { id: "5", status: "offer" },
    ];

    const grouped = groupJobsByStage(jobs);
    // Active jobs that could be stale: applied(2) + interviewing(1) + offer(1) = 4
    const activeStatuses = ["applied", "screening", "interviewing", "final-round", "offer", "negotiating"];
    const activeCount = activeStatuses.reduce(
      (sum, s) => sum + grouped[s].count,
      0
    );
    expect(activeCount).toBe(4);
  });

  it("STALE_THRESHOLD_DAYS is 14", () => {
    expect(STALE_THRESHOLD_DAYS).toBe(14);
  });
});

describe("Analytics: Pipeline Stage Grouping for Dashboard", () => {
  it("groups jobs with enhanced statuses correctly", () => {
    const jobs = [
      { id: "1", status: "researching" },
      { id: "2", status: "screening" },
      { id: "3", status: "final-round" },
      { id: "4", status: "negotiating" },
      { id: "5", status: "accepted" },
      { id: "6", status: "withdrawn" },
    ];

    const result = groupJobsByStage(jobs);
    expect(result["researching"].count).toBe(1);
    expect(result["screening"].count).toBe(1);
    expect(result["final-round"].count).toBe(1);
    expect(result["negotiating"].count).toBe(1);
    expect(result["accepted"].count).toBe(1);
    expect(result["withdrawn"].count).toBe(1);
  });

  it("counts total pipeline correctly for dashboard display", () => {
    const jobs = [
      { id: "1", status: "saved" },
      { id: "2", status: "applied" },
      { id: "3", status: "interviewing" },
      { id: "4", status: "rejected" },
    ];

    const result = groupJobsByStage(jobs);
    const totalCount = Object.values(result).reduce((sum, g) => sum + g.count, 0);
    expect(totalCount).toBe(4);
  });
});
