import { describe, it, expect } from "vitest";
import {
  PIPELINE_STAGES,
  ARCHIVED_STATUSES,
  ACTIVE_STATUSES,
  groupJobsByStage,
  findStaleApplications,
  computeConversionRates,
  STALE_THRESHOLD_DAYS,
} from "../tracker-helpers";

describe("PIPELINE_STAGES", () => {
  it("has 12 stages in the correct order", () => {
    expect(PIPELINE_STAGES).toHaveLength(12);
    expect(PIPELINE_STAGES[0]).toBe("saved");
    expect(PIPELINE_STAGES[11]).toBe("closed");
  });

  it("includes all new enhanced stages", () => {
    expect(PIPELINE_STAGES).toContain("researching");
    expect(PIPELINE_STAGES).toContain("screening");
    expect(PIPELINE_STAGES).toContain("final-round");
    expect(PIPELINE_STAGES).toContain("negotiating");
    expect(PIPELINE_STAGES).toContain("accepted");
    expect(PIPELINE_STAGES).toContain("withdrawn");
  });
});

describe("ARCHIVED_STATUSES", () => {
  it("includes withdrawn", () => {
    expect(ARCHIVED_STATUSES).toContain("withdrawn");
  });

  it("includes rejected, closed, and accepted", () => {
    expect(ARCHIVED_STATUSES).toContain("rejected");
    expect(ARCHIVED_STATUSES).toContain("closed");
    expect(ARCHIVED_STATUSES).toContain("accepted");
  });
});

describe("ACTIVE_STATUSES", () => {
  it("does not include archived statuses", () => {
    for (const archived of ARCHIVED_STATUSES) {
      expect(ACTIVE_STATUSES).not.toContain(archived);
    }
  });

  it("includes saved, applied, interviewing", () => {
    expect(ACTIVE_STATUSES).toContain("saved");
    expect(ACTIVE_STATUSES).toContain("applied");
    expect(ACTIVE_STATUSES).toContain("interviewing");
  });
});

describe("groupJobsByStage", () => {
  it("groups jobs correctly by their status", () => {
    const jobs = [
      { id: "1", status: "saved" },
      { id: "2", status: "saved" },
      { id: "3", status: "applied" },
      { id: "4", status: "interviewing" },
      { id: "5", status: "offer" },
    ];

    const result = groupJobsByStage(jobs);

    expect(result["saved"].count).toBe(2);
    expect(result["saved"].jobs).toHaveLength(2);
    expect(result["applied"].count).toBe(1);
    expect(result["interviewing"].count).toBe(1);
    expect(result["offer"].count).toBe(1);
    expect(result["rejected"].count).toBe(0);
  });

  it("handles empty job list", () => {
    const result = groupJobsByStage([]);
    for (const stage of PIPELINE_STAGES) {
      expect(result[stage].count).toBe(0);
      expect(result[stage].jobs).toHaveLength(0);
    }
  });

  it("puts unknown statuses into saved as fallback", () => {
    const jobs = [{ id: "1", status: "unknown-stage" }];
    const result = groupJobsByStage(jobs);
    expect(result["saved"].count).toBe(1);
  });
});

describe("findStaleApplications", () => {
  it("identifies stale applications older than threshold", () => {
    const now = new Date("2024-06-01T00:00:00Z");
    const staleDays = STALE_THRESHOLD_DAYS + 5;
    const staleDate = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

    const jobs = [
      { id: "1", updatedAt: staleDate },
      { id: "2", updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago, not stale
    ];

    const result = findStaleApplications(jobs, now);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
    expect(result[0].daysSinceUpdate).toBe(staleDays);
  });

  it("returns empty array when no stale jobs", () => {
    const now = new Date("2024-06-01T00:00:00Z");
    const jobs = [
      { id: "1", updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
    ];

    const result = findStaleApplications(jobs, now);
    expect(result).toHaveLength(0);
  });

  it("sorts by most stale first", () => {
    const now = new Date("2024-06-01T00:00:00Z");
    const jobs = [
      { id: "1", updatedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) },
      { id: "2", updatedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      { id: "3", updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) },
    ];

    const result = findStaleApplications(jobs, now);
    expect(result[0].id).toBe("2"); // 30 days
    expect(result[1].id).toBe("1"); // 20 days
    expect(result[2].id).toBe("3"); // 15 days
  });
});

describe("computeConversionRates", () => {
  it("computes conversion rates between stages", () => {
    const stageCounts: Record<string, number> = {
      saved: 10,
      researching: 5,
      applied: 8,
      screening: 4,
      interviewing: 3,
      "final-round": 2,
      offer: 1,
      negotiating: 1,
      accepted: 0,
      rejected: 5,
      withdrawn: 2,
      closed: 1,
    };

    const rates = computeConversionRates(stageCounts);

    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].from).toBe("saved");
    expect(rates[0].to).toBe("researching");
    // All rates should be between 0 and 100
    for (const r of rates) {
      expect(r.rate).toBeGreaterThanOrEqual(0);
      expect(r.rate).toBeLessThanOrEqual(100);
    }
  });

  it("returns 0 rate when from stage has 0 jobs", () => {
    const stageCounts: Record<string, number> = {
      saved: 0,
      researching: 0,
      applied: 0,
      screening: 0,
      interviewing: 0,
      "final-round": 0,
      offer: 0,
      negotiating: 0,
      accepted: 0,
    };

    const rates = computeConversionRates(stageCounts);
    for (const r of rates) {
      expect(r.rate).toBe(0);
    }
  });
});
