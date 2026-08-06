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

  it("computes 100% when all jobs have progressed to accepted", () => {
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

  it("computes intermediate conversion rates correctly", () => {
    const stageCounts: Record<string, number> = {};
    for (const s of PIPELINE_STAGES) stageCounts[s] = 0;
    stageCounts["saved"] = 5;
    stageCounts["applied"] = 3;
    stageCounts["interviewing"] = 2;

    const rates = computeConversionRates(stageCounts);
    // From saved: 10 total at saved or beyond, 5 beyond saved
    // saved -> researching: (5+3+2 beyond saved = 5) / (5+5+3+2 = 10) ... 
    // Actually the calculation is: fromCount = sum from current stage onwards, toCount = sum from next stage onwards
    // saved: fromCount = 5+0+3+0+2+0+0+0+0 = 10, toCount = 0+3+0+2+0+0+0+0 = 5, rate = 50%
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
