import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreate = vi.fn();

// Mock openai before importing llmParseJob
vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

// Mock the llm-guard module to avoid side effects
vi.mock("../llm-guard", () => ({
  validateInputLength: vi.fn(),
  llmSemaphore: { acquire: vi.fn().mockResolvedValue(undefined), release: vi.fn() },
  createAbortSignal: vi.fn().mockReturnValue(new AbortController().signal),
  logLLMCost: vi.fn(),
  MAX_OUTPUT_TOKENS: 4096,
  MAX_USER_INPUT_LENGTH: 15000,
  checkDailyBudget: vi.fn().mockReturnValue({ allowed: true, spent: 0, limit: 5 }),
}));

// Mock the auth module
vi.mock("../auth", () => ({
  isDemoMode: vi.fn().mockReturnValue(false),
}));

import { llmParseJob } from "../llm-parse-job";

describe("llmParseJob", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };
    mockCreate.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns correctly when OpenAI returns valid JSON", async () => {
    const validResponse = {
      title: "Senior Engineer",
      company: "Acme Corp",
      location: "Remote",
      keywords: ["TypeScript", "React"],
      phrases: [
        { text: "Build scalable apps", category: "responsibility", keywords: ["TypeScript"] },
      ],
    };

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validResponse) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });

    const result = await llmParseJob("Some job description");
    expect(result.title).toBe("Senior Engineer");
    expect(result.company).toBe("Acme Corp");
    expect(result.location).toBe("Remote");
    expect(result.keywords).toEqual(["TypeScript", "React"]);
    expect(result.phrases).toHaveLength(1);
  });

  it("throws when OpenAI returns invalid structure (missing title)", async () => {
    const invalidResponse = {
      company: "Acme Corp",
      location: "Remote",
      keywords: ["TypeScript"],
      phrases: [],
      // missing title
    };

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(invalidResponse) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });

    await expect(llmParseJob("Some description")).rejects.toThrow(
      "LLM returned invalid structure"
    );
  });

  it("throws when OpenAI returns empty content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    await expect(llmParseJob("Some description")).rejects.toThrow(
      "No response from LLM"
    );
  });

  it("throws when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(llmParseJob("Some description")).rejects.toThrow(
      "OPENAI_API_KEY not set"
    );
  });

  it("returns demo response when in demo mode", async () => {
    const { isDemoMode } = await import("../auth");
    vi.mocked(isDemoMode).mockReturnValue(true);

    const result = await llmParseJob("Any text");
    expect(result.title).toBe("Demo Software Engineer");
    expect(result.company).toBe("Demo Corp");

    vi.mocked(isDemoMode).mockReturnValue(false);
  });
});
