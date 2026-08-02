import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRateLimiter } from "../rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

    const result1 = limiter.checkRateLimit("user1");
    const result2 = limiter.checkRateLimit("user1");
    const result3 = limiter.checkRateLimit("user1");

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
  });

  it("returns { allowed: false } when limit is exceeded", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.checkRateLimit("user1");
    limiter.checkRateLimit("user1");
    const result = limiter.checkRateLimit("user1");

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeDefined();
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.checkRateLimit("user1");
    limiter.checkRateLimit("user1");

    // Should be rate limited now
    expect(limiter.checkRateLimit("user1").allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(60_001);

    // Should be allowed again
    const result = limiter.checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("tracks limits independently per key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.checkRateLimit("user1");
    limiter.checkRateLimit("user2");

    // user1 is rate limited
    expect(limiter.checkRateLimit("user1").allowed).toBe(false);
    // user2 is rate limited
    expect(limiter.checkRateLimit("user2").allowed).toBe(false);
    // user3 is not yet limited
    expect(limiter.checkRateLimit("user3").allowed).toBe(true);
  });

  it("provides retryAfterMs within the window duration", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 1 });

    limiter.checkRateLimit("user1");
    const result = limiter.checkRateLimit("user1");

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(1000);
  });
});
