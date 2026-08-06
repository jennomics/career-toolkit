import { ApiError, VALIDATION_ERROR } from "./api-error";
import { prisma } from "@/lib/db";

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

// --- Daily budget tracking (persistent via Postgres) ---
//
// Budget is tracked per UTC date in the LlmBudget table. Each serverless
// instance reads/writes to the same row, providing a true daily ceiling
// across all instances. DB failures are handled gracefully: if the budget
// table is unreachable, requests are allowed (fail-open) to avoid blocking
// users due to infrastructure issues.

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// Approximate cost per 1M tokens by model (input/output)
const MODEL_COSTS: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.0 },
  "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0 },
};

/**
 * Checks if the daily LLM budget has been exceeded.
 * Queries the LlmBudget row for today's date. If no row exists, budget is $0 spent (allowed).
 * On DB failure, gracefully degrades by allowing the request.
 */
export async function checkDailyBudget(): Promise<{ allowed: boolean; spent: number; limit: number }> {
  const todayUTC = getTodayUTC();

  try {
    const record = await prisma.llmBudget.findUnique({
      where: { date: todayUTC },
    });

    const spent = record?.totalUsd ?? 0;
    return {
      allowed: spent < DAILY_BUDGET_USD,
      spent,
      limit: DAILY_BUDGET_USD,
    };
  } catch (err) {
    console.warn("[llm-guard] Failed to check daily budget from DB, allowing request (graceful degradation):", err);
    return {
      allowed: true,
      spent: 0,
      limit: DAILY_BUDGET_USD,
    };
  }
}

/**
 * Logs estimated cost for an LLM call and tracks daily spend in the database.
 * Uses an atomic upsert with increment to avoid race conditions.
 * On DB failure, logs a warning but does not throw.
 */
export async function logLLMCost(model: string, inputTokens: number, outputTokens: number): Promise<void> {
  const todayUTC = getTodayUTC();

  const costs = MODEL_COSTS[model] || { inputPer1M: 1.0, outputPer1M: 2.0 };
  const inputCost = (inputTokens / 1_000_000) * costs.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * costs.outputPer1M;
  const totalCost = inputCost + outputCost;

  try {
    const updated = await prisma.llmBudget.upsert({
      where: { date: todayUTC },
      create: { date: todayUTC, totalUsd: totalCost },
      update: { totalUsd: { increment: totalCost } },
    });

    console.log(
      `[llm-cost] model=${model} input_tokens=${inputTokens} output_tokens=${outputTokens} cost=$${totalCost.toFixed(6)} daily_total=$${updated.totalUsd.toFixed(4)}`
    );
  } catch (err) {
    console.warn("[llm-guard] Failed to log LLM cost to DB (graceful degradation):", err);
    console.log(
      `[llm-cost] model=${model} input_tokens=${inputTokens} output_tokens=${outputTokens} cost=$${totalCost.toFixed(6)} daily_total=unknown (DB unavailable)`
    );
  }
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
