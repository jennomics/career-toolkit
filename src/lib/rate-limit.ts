interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Creates an in-memory sliding window rate limiter.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options;
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup to prevent memory leaks
  const CLEANUP_INTERVAL = 60_000;
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    const cutoff = now - windowMs;
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }

  /**
   * Checks if the given key is within rate limits.
   * Returns { allowed: true } if the request is permitted,
   * or { allowed: false, retryAfterMs } if the limit is exceeded.
   */
  function checkRateLimit(key: string): RateLimitResult {
    cleanup();

    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

    if (entry.timestamps.length >= maxRequests) {
      // Rate limited - calculate retry-after based on oldest timestamp in window
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }

    // Allow the request and record the timestamp
    entry.timestamps.push(now);
    return { allowed: true };
  }

  return { checkRateLimit };
}

/** Pre-configured rate limiter for LLM endpoints (10 requests per minute). */
export const llmRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
});

/** Pre-configured rate limiter for general API endpoints (100 requests per minute). */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
});
