import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock guarded-llm module
const mockGuardedLLMCall = vi.fn();
vi.mock("../guarded-llm", () => ({
  guardedLLMCall: (...args: unknown[]) => mockGuardedLLMCall(...args),
}));

// Mock openai (needed for any transitive imports)
vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };
    },
  };
});

// Mock the llm-guard module
vi.mock("../llm-guard", () => ({
  validateInputLength: vi.fn(),
  llmSemaphore: {
    acquire: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  },
  createAbortSignal: vi.fn().mockReturnValue(new AbortController().signal),
  logLLMCost: vi.fn(),
  MAX_OUTPUT_TOKENS: 4096,
  checkDailyBudget: vi
    .fn()
    .mockReturnValue({ allowed: true, spent: 0, limit: 5 }),
}));

// Mock Prisma
const mockPrisma = {
  postingDecomposition: {
    findUnique: vi.fn(),
  },
  claim: {
    findMany: vi.fn(),
  },
  candidateProfile: {
    findFirst: vi.fn(),
  },
  negativeAssertion: {
    findMany: vi.fn(),
  },
  retrievalLog: {
    create: vi.fn(),
  },
  generationRecord: {
    create: vi.fn(),
  },
};

vi.mock("../db", () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, prop) {
        return (mockPrisma as Record<string, unknown>)[prop as string];
      },
    }
  ),
}));

// Import after mocks
import { runPreflight } from "../generation/preflight";
import {
  runDeterministicChecks,
  renderSpansToText,
} from "../generation/deterministic";
import { runPipeline } from "../generation/pipeline";
import type { SpanOutput } from "../generation/types";

// Import prompts to ensure they register
import "../prompts/resume";
import "../prompts/cover-letter";
import "../prompts/critique";

describe("Generation Pipeline", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-api-key" };
    vi.resetAllMocks();

    // Default mock returns
    mockPrisma.negativeAssertion.findMany.mockResolvedValue([]);
    mockPrisma.retrievalLog.create.mockResolvedValue({});
    mockPrisma.candidateProfile.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Preflight Stage", () => {
    it("passes with valid decomposition and claims", async () => {
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Scale the engineering team",
        responsibilities: ["Lead engineering"],
        statedBars: ["5+ years experience"],
        vocabulary: ["platform", "scale"],
        hiringQuestions: [
          {
            question: "Can this person lead a distributed engineering team?",
            rationale: "Team is remote-first",
          },
        ],
      });

      mockPrisma.claim.findMany.mockResolvedValue([
        {
          id: "claim-1",
          statement:
            "Led a distributed engineering team of 12 across 4 time zones",
          category: "capability",
          artifacts: [
            { passageText: "managed distributed engineering team globally" },
          ],
        },
      ]);

      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test User",
      });

      const result = await runPreflight({
        jobId: "job-1",
        documentType: "cover-letter",
      });

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.decomposition).not.toBeNull();
      expect(result.decomposition!.jobId).toBe("job-1");
    });

    it("fails when decomposition is missing", async () => {
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue(null);

      const result = await runPreflight({
        jobId: "nonexistent-job",
        documentType: "resume",
      });

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("No PostingDecomposition found");
    });

    it("fails when no active claims exist", async () => {
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Scale the engineering team",
        responsibilities: ["Lead engineering"],
        statedBars: [],
        vocabulary: [],
        hiringQuestions: [],
      });

      mockPrisma.claim.findMany.mockResolvedValue([]);
      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test",
      });

      const result = await runPreflight({
        jobId: "job-1",
        documentType: "resume",
      });

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes("No active claims"))).toBe(
        true
      );
    });

    it("fails in strict gaps mode when hiring questions have no matching claims", async () => {
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Build ML infrastructure",
        responsibilities: ["ML Platform"],
        statedBars: [],
        vocabulary: [],
        hiringQuestions: [
          {
            question: "Can they build quantum computing systems?",
            rationale: "Future tech",
          },
        ],
      });

      mockPrisma.claim.findMany.mockResolvedValue([
        {
          id: "claim-1",
          statement: "Built web applications with React",
          category: "capability",
          artifacts: [{ passageText: "React developer" }],
        },
      ]);

      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test",
      });

      const result = await runPreflight({
        jobId: "job-1",
        documentType: "resume",
        options: { strictGaps: true },
      });

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes("Strict gaps mode"))).toBe(
        true
      );
    });
  });

  describe("Deterministic Checks", () => {
    it("catches negative assertions", async () => {
      mockPrisma.negativeAssertion.findMany.mockResolvedValue([
        {
          id: "na-1",
          forbiddenText: "synergy",
          reason: "Corporate buzzword not in voice",
          claimId: "claim-1",
        },
      ]);

      const spans: SpanOutput[] = [
        {
          text: "I bring strong synergy to cross-functional teams. ",
          claimId: "claim-1",
          modelSupplied: false,
        },
        {
          text: "I've led projects across multiple departments.",
          claimId: "claim-2",
          modelSupplied: false,
        },
      ];

      const result = await runDeterministicChecks(spans, "cover-letter");

      expect(result.passed).toBe(false);
      expect(
        result.failures.some((f) => f.includes("synergy"))
      ).toBe(true);
    });

    it("validates word count for cover letters - too short", async () => {
      const shortText = "This is too short.";
      const spans: SpanOutput[] = [
        { text: shortText, claimId: null, modelSupplied: true },
      ];

      const result = await runDeterministicChecks(spans, "cover-letter");

      expect(result.passed).toBe(false);
      expect(
        result.failures.some((f) => f.includes("word count too low"))
      ).toBe(true);
    });

    it("validates word count for cover letters - too long", async () => {
      // Generate 310 words
      const longText = Array(310).fill("word").join(" ") + ".";
      const spans: SpanOutput[] = [
        { text: longText, claimId: null, modelSupplied: true },
      ];

      const result = await runDeterministicChecks(spans, "cover-letter");

      expect(result.passed).toBe(false);
      expect(
        result.failures.some((f) => f.includes("word count too high"))
      ).toBe(true);
    });

    it("catches markdown artifacts", async () => {
      // Generate enough words to pass word count, include contractions
      const words = Array(260).fill("word").join(" ");
      const spans: SpanOutput[] = [
        {
          text: `## Summary\nI've worked on ${words} and it's great.`,
          claimId: null,
          modelSupplied: true,
        },
      ];

      const result = await runDeterministicChecks(spans, "cover-letter");

      expect(result.passed).toBe(false);
      expect(
        result.failures.some((f) => f.includes("Markdown artifact"))
      ).toBe(true);
    });

    it("catches confidentiality issues with placeholder tokens", async () => {
      const words = Array(260).fill("word").join(" ");
      const spans: SpanOutput[] = [
        {
          text: `I'm excited about [COMPANY] and I've ${words} done well.`,
          claimId: null,
          modelSupplied: true,
        },
      ];

      const result = await runDeterministicChecks(spans, "cover-letter");

      expect(result.passed).toBe(false);
      expect(
        result.failures.some((f) => f.includes("Confidentiality issue"))
      ).toBe(true);
    });

    it("passes when all checks are satisfied for resume", async () => {
      const spans: SpanOutput[] = [
        {
          text: "Led engineering team of 12 to deliver platform migration in 6 months. ",
          claimId: "claim-1",
          modelSupplied: false,
        },
        {
          text: "Reduced infrastructure costs by 40% through automated scaling.",
          claimId: "claim-2",
          modelSupplied: false,
        },
      ];

      const result = await runDeterministicChecks(spans, "resume");

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it("checks contraction requirement for cover letters", async () => {
      // 260 words without any contractions
      const words = Array(260).fill("word").join(" ");
      const spans: SpanOutput[] = [
        {
          text: `I am writing to say that ${words} is important.`,
          claimId: null,
          modelSupplied: true,
        },
      ];

      const result = await runDeterministicChecks(spans, "cover-letter");

      expect(result.passed).toBe(false);
      expect(
        result.failures.some((f) => f.includes("No contractions"))
      ).toBe(true);
    });
  });

  describe("renderSpansToText", () => {
    it("concatenates all span text", () => {
      const spans: SpanOutput[] = [
        { text: "Hello ", claimId: null, modelSupplied: true },
        { text: "world.", claimId: "claim-1", modelSupplied: false },
      ];

      expect(renderSpansToText(spans)).toBe("Hello world.");
    });
  });

  describe("Pipeline Orchestrator", () => {
    it("returns failure at preflight stage when decomposition missing", async () => {
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue(null);

      const result = await runPipeline({
        jobId: "missing-job",
        documentType: "resume",
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("preflight");
      expect(result.error).toContain("No PostingDecomposition found");
    });

    it("returns failure at context assembly when claims block is empty", async () => {
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Test problem",
        responsibilities: ["Resp 1"],
        statedBars: [],
        vocabulary: ["test"],
        hiringQuestions: [
          { question: "Can they code?", rationale: "Need coders" },
        ],
      });

      // Claims exist for preflight but are empty for context
      mockPrisma.claim.findMany
        .mockResolvedValueOnce([
          {
            id: "claim-1",
            statement: "I code well",
            category: "capability",
            artifacts: [{ passageText: "code capability" }],
          },
        ])
        .mockResolvedValueOnce([]); // Empty for context assembly

      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test",
      });

      const result = await runPipeline({
        jobId: "job-1",
        documentType: "resume",
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("context_assembly");
    });

    it("handles successful end-to-end flow with mocked LLM calls", async () => {
      // Setup: decomposition exists
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Scale the platform",
        responsibilities: ["Lead engineering", "Build scalable systems"],
        statedBars: ["5+ years experience"],
        vocabulary: ["platform", "scale", "distributed"],
        hiringQuestions: [
          {
            question:
              "Can they scale distributed systems platform effectively?",
            rationale: "Core requirement for platform growth",
          },
        ],
      });

      // Claims exist - ensure enough keyword overlap (need 3+ significant words)
      const mockClaims = [
        {
          id: "claim-1",
          statement:
            "Scaled distributed systems platform serving 10M requests per day",
          category: "numeric",
          artifacts: [
            {
              passageText:
                "Led the scaling of distributed systems platform handling 10M daily requests",
            },
          ],
        },
        {
          id: "claim-2",
          statement:
            "Reduced latency by 60% through distributed platform architecture redesign",
          category: "numeric",
          artifacts: [
            {
              passageText:
                "Distributed platform architecture redesign reduced system latency by 60%",
            },
          ],
        },
      ];

      mockPrisma.claim.findMany.mockResolvedValue(mockClaims);
      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test User",
        positioningStatements: [],
        careerRoles: [],
        signatureStories: [],
        profileMetrics: [],
        unresolvedItems: [],
        writingSamples: [],
        selfDescribedStrengths: [],
        resumeOperatingRules: [],
      });

      // Mock LLM calls:
      // 1. Generation call returns valid spans
      const generationResponse = JSON.stringify({
        spans: [
          {
            text: "Scaled distributed systems serving 10M requests per day, reducing latency by 60% through architecture redesign.",
            claimId: "claim-1",
            modelSupplied: false,
          },
          {
            text: "Led cross-functional teams to deliver platform improvements on schedule.",
            claimId: "claim-2",
            modelSupplied: false,
          },
        ],
      });

      // 2. Critique call returns no issues (passes)
      const critiqueResponse = JSON.stringify({
        issues: [],
        overallScore: 9,
        passesReview: true,
      });

      mockGuardedLLMCall
        .mockResolvedValueOnce(generationResponse)
        .mockResolvedValueOnce(critiqueResponse);

      // Mock DB record creation
      mockPrisma.generationRecord.create.mockResolvedValue({
        id: "gen-record-1",
        documentType: "resume",
        jobId: "job-1",
      });

      const result = await runPipeline({
        jobId: "job-1",
        documentType: "resume",
      });

      expect(result.success).toBe(true);
      expect(result.generationId).toBe("gen-record-1");
      expect(result.text).toContain("10M requests");
      expect(result.spans).toHaveLength(2);
      expect(result.spans![0].claimId).toBe("claim-1");

      // Verify guardedLLMCall was called for generation and critique
      expect(mockGuardedLLMCall).toHaveBeenCalledTimes(2);

      // Verify the generation call used jsonMode
      expect(mockGuardedLLMCall.mock.calls[0][0]).toMatchObject({
        jsonMode: true,
      });

      // Verify DB record was created
      expect(mockPrisma.generationRecord.create).toHaveBeenCalledTimes(1);
    });

    it("fails at generation stage when LLM returns invalid JSON", async () => {
      // Setup valid preflight - ensure claim matches question with enough keyword overlap
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Test",
        responsibilities: ["Test resp"],
        statedBars: [],
        vocabulary: ["test"],
        hiringQuestions: [
          {
            question:
              "Can they build scalable distributed platform systems?",
            rationale: "Need platform builders",
          },
        ],
      });

      mockPrisma.claim.findMany.mockResolvedValue([
        {
          id: "claim-1",
          statement:
            "Built scalable distributed platform systems handling millions of requests",
          category: "capability",
          artifacts: [
            {
              passageText:
                "Architected scalable distributed platform systems for high throughput",
            },
          ],
        },
      ]);

      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test",
      });

      // LLM returns non-JSON
      mockGuardedLLMCall.mockResolvedValueOnce("This is plain prose, not JSON.");

      const result = await runPipeline({
        jobId: "job-1",
        documentType: "resume",
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("generation");
      expect(result.error).toContain("invalid JSON");
    });

    it("fails at deterministic checks stage", async () => {
      // Setup valid preflight - ensure claim matches question with enough keyword overlap
      mockPrisma.postingDecomposition.findUnique.mockResolvedValue({
        id: "decomp-1",
        jobId: "job-1",
        problemStatement: "Test",
        responsibilities: ["Test resp"],
        statedBars: [],
        vocabulary: ["test"],
        hiringQuestions: [
          {
            question:
              "Can they handle scalable distributed infrastructure systems?",
            rationale: "Need infrastructure skills",
          },
        ],
      });

      mockPrisma.claim.findMany.mockResolvedValue([
        {
          id: "claim-1",
          statement:
            "Managed scalable distributed infrastructure systems in production environments",
          category: "capability",
          artifacts: [
            {
              passageText:
                "Operated scalable distributed infrastructure systems at enterprise scale",
            },
          ],
        },
      ]);

      mockPrisma.candidateProfile.findFirst.mockResolvedValue({
        id: "profile-1",
        name: "Test",
      });

      // Add a negative assertion that will be violated
      mockPrisma.negativeAssertion.findMany.mockResolvedValue([
        {
          id: "na-1",
          forbiddenText: "synergy",
          reason: "Corporate buzzword",
          claimId: "claim-1",
        },
      ]);

      // LLM returns spans containing forbidden text
      const generationResponse = JSON.stringify({
        spans: [
          {
            text: "I bring synergy to cross-functional teams.",
            claimId: "claim-1",
            modelSupplied: false,
          },
        ],
      });

      mockGuardedLLMCall.mockResolvedValueOnce(generationResponse);

      const result = await runPipeline({
        jobId: "job-1",
        documentType: "resume",
      });

      expect(result.success).toBe(false);
      expect(result.stage).toBe("deterministic_checks");
      expect(result.failures).toBeDefined();
      expect(result.failures!.some((f) => f.includes("synergy"))).toBe(true);
    });
  });
});
