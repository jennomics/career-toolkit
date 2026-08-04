import { ApiError, VALIDATION_ERROR } from "./api-error";

/** Maximum input length for LLM requests (characters). */
export const MAX_INPUT_LENGTH = 100000;

/** Maximum length for user-provided raw text input (e.g., pasted job descriptions). */
export const MAX_USER_INPUT_LENGTH = 15000;

/** Request timeout for LLM calls (milliseconds). */
export const REQUEST_TIMEOUT_MS = 30000;

/** Maximum output tokens for LLM responses. */
export const MAX_OUTPUT_TOKENS = 4096;

/** Maximum concurrent LLM calls. */
export const CONCURRENCY_LIMIT = 3;

/** Daily budget limit in USD. */
export const DAILY_BUDGET_USD = 5.0;

// --- Daily budget tracking ---
//
// NOTE: This is a best-effort heuristic. The in-memory dailySpend counter
// resets on every process restart or serverless cold start. In a serverless
// deployment (e.g., Vercel Edge/Serverless), each function invocation may
// start with totalUsd = 0. For a hard budget ceiling, a persistent store
// (e.g., database row or Redis) would be needed. For this single-tenant app,
// in-memory tracking provides reasonable protection against runaway costs
// during a single server session.

interface DailySpend {
  date: string; // YYYY-MM-DD in UTC
  totalUsd: number;
}

let dailySpend: DailySpend = {
  date: new Date().toISOString().slice(0, 10),
  totalUsd: 0,
};

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function resetIfNewDay(): void {
  const today = getTodayUTC();
  if (dailySpend.date !== today) {
    dailySpend = { date: today, totalUsd: 0 };
  }
}

/**
 * Checks if the daily LLM budget has been exceeded.
 */
export function checkDailyBudget(): { allowed: boolean; spent: number; limit: number } {
  resetIfNewDay();
  return {
    allowed: dailySpend.totalUsd < DAILY_BUDGET_USD,
    spent: dailySpend.totalUsd,
    limit: DAILY_BUDGET_USD,
  };
}

// Approximate cost per 1M tokens by model (input/output)
const MODEL_COSTS: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.0 },
  "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0 },
};

/**
 * Logs estimated cost for an LLM call and tracks daily spend.
 */
export function logLLMCost(model: string, inputTokens: number, outputTokens: number): void {
  resetIfNewDay();

  const costs = MODEL_COSTS[model] || { inputPer1M: 1.0, outputPer1M: 2.0 };
  const inputCost = (inputTokens / 1_000_000) * costs.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * costs.outputPer1M;
  const totalCost = inputCost + outputCost;

  dailySpend.totalUsd += totalCost;

  console.log(
    `[llm-cost] model=${model} input_tokens=${inputTokens} output_tokens=${outputTokens} cost=$${totalCost.toFixed(6)} daily_total=$${dailySpend.totalUsd.toFixed(4)}`
  );
}

/**
 * Validates that the input text does not exceed the given limit.
 * Defaults to MAX_INPUT_LENGTH (100K, for assembled prompts).
 * Use MAX_USER_INPUT_LENGTH (15K) for raw user-pasted text.
 * Throws an ApiError with VALIDATION_ERROR if too long.
 */
export function validateInputLength(text: string, limit: number = MAX_INPUT_LENGTH): void {
  if (text.length > limit) {
    throw new ApiError(
      `Input too long: ${text.length} characters exceeds maximum of ${limit}`,
      VALIDATION_ERROR,
      400
    );
  }
}

/**
 * Creates an AbortSignal that triggers after REQUEST_TIMEOUT_MS.
 */
export function createAbortSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

// --- Semaphore for concurrency limiting ---

/**
 * A counting semaphore for limiting concurrent access to a resource.
 */
export class Semaphore {
  private permits: number;
  private readonly queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * Acquires a permit. If none are available, waits until one is released.
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Releases a permit, potentially unblocking a waiting acquire() call.
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

/** Global LLM concurrency semaphore. */
export const llmSemaphore = new Semaphore(CONCURRENCY_LIMIT);
