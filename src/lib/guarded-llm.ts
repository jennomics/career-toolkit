import OpenAI from "openai";
import {
  validateInputLength,
  llmSemaphore,
  createAbortSignal,
  logLLMCost,
  MAX_OUTPUT_TOKENS,
  checkDailyBudget,
} from "./llm-guard";
import { ApiError } from "./api-error";

/**
 * Options for a guarded LLM call.
 */
export interface GuardedLLMOptions {
  /** The model to use (e.g., "gpt-4o", "gpt-4o-mini"). */
  model: string;
  /** Temperature setting. */
  temperature?: number;
  /** Messages for the chat completion. */
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  /** Whether to request JSON output format. */
  jsonMode?: boolean;
  /** Optional max_tokens override (defaults to MAX_OUTPUT_TOKENS). */
  maxTokens?: number;
}

/**
 * Executes an LLM call with full guard chain:
 * - Input validation (total message content length)
 * - Daily budget check
 * - Concurrency semaphore
 * - Request timeout via AbortSignal
 * - Cost logging after completion
 *
 * Returns the raw content string from the LLM response.
 * Throws ApiError on validation/budget/timeout failures.
 */
export async function guardedLLMCall(options: GuardedLLMOptions): Promise<string> {
  const { model, temperature = 0.3, messages, jsonMode = true, maxTokens } = options;

  // Validate combined input length
  const totalInput = messages.map((m) => m.content).join("\n");
  validateInputLength(totalInput);

  // Check daily budget
  const budget = checkDailyBudget();
  if (!budget.allowed) {
    throw new ApiError(
      `Daily LLM budget exceeded ($${budget.spent.toFixed(2)}/$${budget.limit.toFixed(2)})`,
      "RATE_LIMITED",
      429
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ApiError("No OpenAI API key configured", "INTERNAL_ERROR", 503);
  }

  const openai = new OpenAI({ apiKey });

  // Acquire concurrency semaphore
  await llmSemaphore.acquire();
  try {
    const response = await openai.chat.completions.create(
      {
        model,
        temperature,
        max_tokens: maxTokens ?? MAX_OUTPUT_TOKENS,
        messages,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      },
      { signal: createAbortSignal() }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new ApiError("No response from LLM", "INTERNAL_ERROR", 500);
    }

    // Log cost
    if (response.usage) {
      logLLMCost(model, response.usage.prompt_tokens, response.usage.completion_tokens);
    }

    return content;
  } finally {
    llmSemaphore.release();
  }
}
