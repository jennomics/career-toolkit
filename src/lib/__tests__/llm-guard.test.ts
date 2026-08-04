import { describe, it, expect, vi } from "vitest";
import {
  validateInputLength,
  MAX_INPUT_LENGTH,
  MAX_USER_INPUT_LENGTH,
  Semaphore,
  logLLMCost,
} from "../llm-guard";
import { ApiError } from "../api-error";

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

describe("logLLMCost", () => {
  it("does not throw (basic smoke test)", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => logLLMCost("gpt-4o-mini", 1000, 500)).not.toThrow();
    consoleSpy.mockRestore();
  });

  it("logs cost information to console", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logLLMCost("gpt-4o-mini", 1000, 500);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[llm-cost]")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("gpt-4o-mini")
    );
    consoleSpy.mockRestore();
  });
});
