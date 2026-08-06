import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateInputLength,
  MAX_INPUT_LENGTH,
  MAX_USER_INPUT_LENGTH,
  Semaphore,
  logLLMCost,
  checkDailyBudget,
  DAILY_BUDGET_USD,
} from "../llm-guard";
import { ApiError } from "../api-error";

// Mock the prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    llmBudget: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

const mockedPrisma = prisma as unknown as {
  llmBudget: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateInputLength", () => {
  it("does not throw for text under MAX_INPUT_LENGTH", () => {
    const text = "a".repeat(MAX_INPUT_LENGTH - 1);
    expect(() => validateInputLength(text)).not.toThrow();
  });

  it("does not throw for text exactly at MAX_INPUT_LENGTH", () => {
    const text = "a".repeat(MAX_INPUT_LENGTH);
    expect(() => validateInputLength(text)).not.toThrow();
  });

  it("throws ApiError with VALIDATION_ERROR for text over MAX_INPUT_LENGTH", () => {
    const text = "a".repeat(MAX_INPUT_LENGTH + 1);
    expect(() => validateInputLength(text)).toThrow(ApiError);

    try {
      validateInputLength(text);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("VALIDATION_ERROR");
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.message).toContain("Input too long");
    }
  });

  it("uses custom limit when provided", () => {
    const text = "a".repeat(16000);
    // Should pass with default (100K) but fail with user input limit (15K)
    expect(() => validateInputLength(text)).not.toThrow();
    expect(() => validateInputLength(text, MAX_USER_INPUT_LENGTH)).toThrow(ApiError);
  });

  it("MAX_USER_INPUT_LENGTH is 15000", () => {
    expect(MAX_USER_INPUT_LENGTH).toBe(15000);
  });

  it("MAX_INPUT_LENGTH is 100000", () => {
    expect(MAX_INPUT_LENGTH).toBe(100000);
  });
});

describe("Semaphore", () => {
  it("allows acquisition up to the permit count", async () => {
    const sem = new Semaphore(2);

    // Should both resolve immediately
    await sem.acquire();
    await sem.acquire();

    // No exception means the permits were granted
    sem.release();
    sem.release();
  });

  it("queues acquires when permits are exhausted", async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];

    // Acquire the one permit
    await sem.acquire();
    order.push(1);

    // This acquire should be queued
    const waitPromise = sem.acquire().then(() => {
      order.push(2);
    });

    // Give microtask a chance to run (it should NOT resolve)
    await Promise.resolve();
    expect(order).toEqual([1]);

    // Release the first permit
    sem.release();

    // Now the queued acquire should resolve
    await waitPromise;
    expect(order).toEqual([1, 2]);

    sem.release();
  });

  it("limits concurrent access (proves queuing works)", async () => {
    const sem = new Semaphore(2);
    let concurrent = 0;
    let maxConcurrent = 0;

    async function task() {
      await sem.acquire();
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      // Simulate some async work
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrent--;
      sem.release();
    }

    // Run 5 tasks - only 2 should run concurrently
    await Promise.all([task(), task(), task(), task(), task()]);

    expect(maxConcurrent).toBe(2);
  });
});

describe("checkDailyBudget", () => {
  it("returns allowed=true when no budget row exists (no spend today)", async () => {
    mockedPrisma.llmBudget.findUnique.mockResolvedValue(null);

    const result = await checkDailyBudget();
    expect(result.allowed).toBe(true);
    expect(result.spent).toBe(0);
    expect(result.limit).toBe(DAILY_BUDGET_USD);
  });

  it("returns allowed=true when spend is under the limit", async () => {
    mockedPrisma.llmBudget.findUnique.mockResolvedValue({
      id: "test-id",
      date: new Date().toISOString().slice(0, 10),
      totalUsd: 2.5,
      updatedAt: new Date(),
    });

    const result = await checkDailyBudget();
    expect(result.allowed).toBe(true);
    expect(result.spent).toBe(2.5);
  });

  it("returns allowed=false when spend exceeds the limit", async () => {
    mockedPrisma.llmBudget.findUnique.mockResolvedValue({
      id: "test-id",
      date: new Date().toISOString().slice(0, 10),
      totalUsd: 6.0,
      updatedAt: new Date(),
    });

    const result = await checkDailyBudget();
    expect(result.allowed).toBe(false);
    expect(result.spent).toBe(6.0);
  });

  it("gracefully degrades on DB failure (allows request)", async () => {
    mockedPrisma.llmBudget.findUnique.mockRejectedValue(new Error("DB connection failed"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await checkDailyBudget();
    expect(result.allowed).toBe(true);
    expect(result.spent).toBe(0);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe("logLLMCost", () => {
  it("upserts the cost to the database", async () => {
    mockedPrisma.llmBudget.upsert.mockResolvedValue({
      id: "test-id",
      date: new Date().toISOString().slice(0, 10),
      totalUsd: 0.001,
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await logLLMCost("gpt-4o-mini", 1000, 500);

    expect(mockedPrisma.llmBudget.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: expect.any(String) },
        create: { date: expect.any(String), totalUsd: expect.any(Number) },
        update: { totalUsd: { increment: expect.any(Number) } },
      })
    );

    consoleSpy.mockRestore();
  });

  it("logs cost information to console", async () => {
    mockedPrisma.llmBudget.upsert.mockResolvedValue({
      id: "test-id",
      date: new Date().toISOString().slice(0, 10),
      totalUsd: 0.001,
      updatedAt: new Date(),
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await logLLMCost("gpt-4o-mini", 1000, 500);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm-cost]")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("gpt-4o-mini")
    );

    consoleSpy.mockRestore();
  });

  it("gracefully degrades on DB failure (does not throw)", async () => {
    mockedPrisma.llmBudget.upsert.mockRejectedValue(new Error("DB connection failed"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(logLLMCost("gpt-4o-mini", 1000, 500)).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });
});
