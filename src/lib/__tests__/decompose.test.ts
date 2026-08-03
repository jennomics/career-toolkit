import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreate = vi.fn();

// Mock openai before importing
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
  checkDailyBudget: vi.fn().mockReturnValue({ allowed: true, spent: 0, limit: 5 }),
}));

import { decomposePosting, fallbackExtraction } from "../decomposition/decompose";

describe("decomposePosting", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };
    mockCreate.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns all fields on successful decomposition", async () => {
    const validResponse = {
      problemStatement: "The company needs to scale its data platform to handle 10x growth.",
      responsibilities: ["Own the data pipeline", "Lead a team of 4 engineers"],
      statedBars: ["5+ years experience with distributed systems"],
      vocabulary: ["zero-trust", "Series B", "platform migration"],
      hiringQuestions: [
        { question: "Can she scale systems under pressure?", rationale: "Growth is 10x in 12 months" },
        { question: "Will he lead through ambiguity?", rationale: "Team is new and undefined" },
      ],
    };

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validResponse) } }],
      usage: { prompt_tokens: 200, completion_tokens: 150 },
    });

    const result = await decomposePosting(
      "We are looking for a Senior Data Engineer to scale our platform...",
      "Senior Data Engineer",
      "Acme Corp"
    );

    expect(result.problemStatement).toBe(validResponse.problemStatement);
    expect(result.responsibilities).toEqual(validResponse.responsibilities);
    expect(result.statedBars).toEqual(validResponse.statedBars);
    expect(result.vocabulary).toEqual(validResponse.vocabulary);
    expect(result.hiringQuestions).toHaveLength(2);
    expect(result.hiringQuestions[0].question).toBe("Can she scale systems under pressure?");
  });

  it("falls back when LLM call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API timeout"));

    const description = `We are looking for someone to lead our engineering team through a critical growth phase.
- Build and scale the data platform
- Manage a team of 5 engineers
- Drive technical strategy`;

    const result = await decomposePosting(description, "Engineering Lead", "TechCo");

    expect(result.problemStatement).toContain("We are looking for someone");
    expect(result.responsibilities.length).toBeGreaterThan(0);
    expect(result.statedBars).toEqual([]);
    expect(result.vocabulary).toEqual([]);
    expect(result.hiringQuestions).toEqual([]);
  });

  it("falls back when LLM returns invalid JSON structure", async () => {
    // Missing required fields
    const invalidResponse = {
      problemStatement: "Some statement",
      // Missing responsibilities, statedBars, vocabulary, hiringQuestions
    };

    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(invalidResponse) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });

    const description = `Join our team as we build the future of fintech.
- Design payment systems
- Implement fraud detection
- Own compliance workflows`;

    const result = await decomposePosting(description, "Payment Engineer", "FinCo");

    // Should fall back to extraction
    expect(result.responsibilities.length).toBeGreaterThan(0);
    expect(result.statedBars).toEqual([]);
    expect(result.hiringQuestions).toEqual([]);
  });
});

describe("fallbackExtraction", () => {
  it("extracts responsibilities from bullet points", () => {
    const description = `We need a senior engineer.
- Build scalable microservices
- Lead code reviews and mentoring
- Design database schemas
Some other non-bullet text here.`;

    const result = fallbackExtraction(description);

    expect(result.responsibilities).toContain("Build scalable microservices");
    expect(result.responsibilities).toContain("Lead code reviews and mentoring");
    expect(result.responsibilities).toContain("Design database schemas");
  });

  it("extracts responsibilities from action verb lines", () => {
    const description = `About the role:
Build and maintain distributed systems at scale
Lead a cross-functional team of engineers
Deliver features that impact millions of users`;

    const result = fallbackExtraction(description);

    expect(result.responsibilities.length).toBeGreaterThan(0);
    expect(result.responsibilities[0]).toContain("Build and maintain");
  });

  it("infers problem statement from first meaningful sentence", () => {
    const description = `We are looking for a technical leader to own our platform reliability as we scale to 100M users.
- Build monitoring systems
- Lead incident response`;

    const result = fallbackExtraction(description);

    expect(result.problemStatement).toContain("We are looking for a technical leader");
  });

  it("returns default problem statement when no meaningful sentence found", () => {
    const description = "- short\n- items";

    const result = fallbackExtraction(description);

    expect(result.problemStatement).toBe(
      "Role purpose could not be determined from the posting."
    );
  });
});
