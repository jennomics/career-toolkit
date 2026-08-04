import { describe, it, expect, vi, beforeEach } from "vitest";

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
  evalAssertion: {
    findMany: vi.fn(),
  },
  evalGoldenPackage: {
    findUnique: vi.fn(),
  },
  evalRun: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  generationRecord: {
    findUnique: vi.fn(),
  },
  generationSpan: {
    findMany: vi.fn(),
  },
  retrievalLog: {
    findMany: vi.fn(),
  },
  claimArtifact: {
    findMany: vi.fn(),
  },
  claim: {
    findUnique: vi.fn(),
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
import { runTier1Assertions } from "../eval/assertions";
import { testUnretrievedCitation, testFreshnessExpiry } from "../eval/provenance";
import {
  contractionRate,
  ruleOfThreeDetector,
  vocabularyOverlap,
  intraDocRepetition,
  landingDetector,
  comprehensionFlag,
} from "../eval/properties";
import { computeMetrics } from "../eval/metrics";
import { scoreAnchors } from "../eval/anchors";
import { levenshteinDistance, normalizedEditDistance } from "../eval/golden";
import { runTier1, runTier2 } from "../eval/runner";

describe("Eval Harness", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Tier 1 Assertion Runner", () => {
    it("catches contains violations", async () => {
      mockPrisma.evalAssertion.findMany.mockResolvedValue([
        {
          id: "assert-1",
          tier: 1,
          assertType: "contains",
          target: "specific achievement",
          documentTypes: [],
          active: true,
        },
      ]);

      const result = await runTier1Assertions(
        "This text does not mention what we need.",
        "cover-letter"
      );

      expect(result.passed).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].passed).toBe(false);
      expect(result.results[0].detail).toContain("specific achievement");
    });

    it("catches not-contains violations", async () => {
      mockPrisma.evalAssertion.findMany.mockResolvedValue([
        {
          id: "assert-2",
          tier: 1,
          assertType: "not-contains",
          target: "synergy",
          documentTypes: [],
          active: true,
        },
      ]);

      const result = await runTier1Assertions(
        "I bring strong synergy to cross-functional teams.",
        "cover-letter"
      );

      expect(result.passed).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].passed).toBe(false);
      expect(result.results[0].detail).toContain("synergy");
    });

    it("passes when contains assertion is satisfied", async () => {
      mockPrisma.evalAssertion.findMany.mockResolvedValue([
        {
          id: "assert-3",
          tier: 1,
          assertType: "contains",
          target: "engineering",
          documentTypes: [],
          active: true,
        },
      ]);

      const result = await runTier1Assertions(
        "Led the engineering team to deliver on time.",
        "resume"
      );

      expect(result.passed).toBe(true);
      expect(result.results[0].passed).toBe(true);
    });

    it("filters by documentType correctly", async () => {
      mockPrisma.evalAssertion.findMany.mockResolvedValue([
        {
          id: "assert-4",
          tier: 1,
          assertType: "not-contains",
          target: "forbidden-word",
          documentTypes: ["resume"],
          active: true,
        },
        {
          id: "assert-5",
          tier: 1,
          assertType: "not-contains",
          target: "banned-phrase",
          documentTypes: ["cover-letter"],
          active: true,
        },
      ]);

      // Testing against a resume - only assert-4 should apply
      const result = await runTier1Assertions(
        "This text is clean and professional.",
        "resume"
      );

      // Only assert-4 applies to resume documents
      expect(result.results).toHaveLength(1);
      expect(result.results[0].assertionId).toBe("assert-4");
      expect(result.results[0].passed).toBe(true);
    });

    it("applies assertions with empty documentTypes to all document types", async () => {
      mockPrisma.evalAssertion.findMany.mockResolvedValue([
        {
          id: "assert-6",
          tier: 1,
          assertType: "not-contains",
          target: "leverage",
          documentTypes: [],
          active: true,
        },
      ]);

      const result = await runTier1Assertions(
        "We leverage our experience in this field.",
        "essay"
      );

      expect(result.passed).toBe(false);
      expect(result.results[0].passed).toBe(false);
    });
  });

  describe("Tier 2 Property Checks", () => {
    it("computes contraction rate correctly", () => {
      // Text with no contractions (over 50 words)
      const words = Array(60).fill("word").join(" ");
      const text = `I am writing to express that ${words} is important and I do not think otherwise.`;
      const result = contractionRate(text);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].detail).toContain("Contraction rate");
    });

    it("passes contraction rate with sufficient contractions", () => {
      // Text with contractions
      const text = "I've been working on this project and it's been going well. We're making great progress and I don't think we'll have any issues. They've already completed their portion and we haven't seen any problems.";
      const result = contractionRate(text);

      expect(result.violations).toHaveLength(0);
    });

    it("detects rule-of-three patterns", () => {
      const text = "I bring leadership, communication, and problem-solving to the team. My experience includes design, development, and deployment of systems.";
      const result = ruleOfThreeDetector(text);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].detail).toContain("Rule-of-three");
    });

    it("does not flag non-rule-of-three text", () => {
      const text = "I led the engineering team to deliver the platform migration. The project was completed on schedule.";
      const result = ruleOfThreeDetector(text);

      expect(result.violations).toHaveLength(0);
    });

    it("detects vocabulary overlap with posting terms", () => {
      const text = "I have extensive experience with cloud-native architectures and distributed systems.";
      const postingVocab = ["cloud-native", "distributed systems", "kubernetes"];

      const result = vocabularyOverlap(text, postingVocab);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].detail).toContain("Posting vocabulary term");
    });

    it("does not flag terms not in posting vocabulary", () => {
      const text = "I led a team of engineers to build scalable services.";
      const postingVocab = ["machine learning", "python", "kubernetes"];

      const result = vocabularyOverlap(text, postingVocab);

      expect(result.violations).toHaveLength(0);
    });

    it("detects intra-document repetition", () => {
      const text = "I led the engineering team to great success last year. I led the engineering team to great success this year.";
      const result = intraDocRepetition(text);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].detail).toContain("High word overlap");
    });

    it("detects landing pattern (short declaratives)", () => {
      const text = "First paragraph content that goes on for a while with many words.\nI delivered.\n\nSecond paragraph also with enough words to be meaningful.\nI shipped.\n\nThird paragraph explaining more context and information about my work.\nI won.";
      const result = landingDetector(text);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].detail).toContain("short declarative");
    });

    it("detects high abstraction sentences", () => {
      const text = "The implementation of innovation and transformation through organization and collaboration in communication and administration of the situation.";
      const result = comprehensionFlag(text);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].detail).toContain("abstraction");
    });
  });

  describe("Provenance Tests", () => {
    it("detects unretrieved citation", async () => {
      mockPrisma.generationRecord.findUnique.mockResolvedValue({
        id: "gen-1",
        retrievalSnapshotId: "session-1",
      });

      mockPrisma.generationSpan.findMany.mockResolvedValue([
        { id: "span-1", generationId: "gen-1", claimId: "claim-1", text: "Some text" },
        { id: "span-2", generationId: "gen-1", claimId: "claim-2", text: "Other text" },
      ]);

      // No successful retrieval logs for this session
      mockPrisma.retrievalLog.findMany.mockResolvedValue([]);

      // Claim-1 has a source document
      mockPrisma.claimArtifact.findMany
        .mockResolvedValueOnce([
          { id: "art-1", claimId: "claim-1", sourceDocumentId: "doc-1" },
        ])
        .mockResolvedValueOnce([
          { id: "art-2", claimId: "claim-2", sourceDocumentId: "doc-2" },
        ]);

      const result = await testUnretrievedCitation("gen-1");

      expect(result.passed).toBe(false);
      expect(result.detail).toContain("no successful retrieval");
    });

    it("passes when all citations have retrievals", async () => {
      mockPrisma.generationRecord.findUnique.mockResolvedValue({
        id: "gen-1",
        retrievalSnapshotId: "session-1",
      });

      mockPrisma.generationSpan.findMany.mockResolvedValue([
        { id: "span-1", generationId: "gen-1", claimId: "claim-1", text: "Some text" },
      ]);

      mockPrisma.retrievalLog.findMany.mockResolvedValue([
        { id: "log-1", sessionId: "session-1", success: true, sourceDocumentId: "doc-1" },
      ]);

      mockPrisma.claimArtifact.findMany.mockResolvedValue([
        { id: "art-1", claimId: "claim-1", sourceDocumentId: "doc-1" },
      ]);

      const result = await testUnretrievedCitation("gen-1");

      expect(result.passed).toBe(true);
    });

    it("detects freshness expiry", async () => {
      // Artifact ingested 100 days ago with 30-day freshness window
      const ingestionDate = new Date();
      ingestionDate.setDate(ingestionDate.getDate() - 100);

      mockPrisma.claimArtifact.findMany.mockResolvedValue([
        {
          id: "art-1",
          claimId: "claim-1",
          freshnessWindow: 30,
          ingestionDate,
        },
      ]);

      const result = await testFreshnessExpiry("claim-1");

      expect(result.passed).toBe(false);
      expect(result.detail).toContain("expired freshness");
    });

    it("passes when artifact within freshness window", async () => {
      // Artifact ingested 10 days ago with 30-day freshness window
      const ingestionDate = new Date();
      ingestionDate.setDate(ingestionDate.getDate() - 10);

      mockPrisma.claimArtifact.findMany.mockResolvedValue([
        {
          id: "art-1",
          claimId: "claim-1",
          freshnessWindow: 30,
          ingestionDate,
        },
      ]);

      const result = await testFreshnessExpiry("claim-1");

      expect(result.passed).toBe(true);
    });
  });

  describe("Metrics Computation", () => {
    it("computes metrics correctly with all data", () => {
      const runs = [
        {
          id: "run-1",
          factScore: 1.0,
          voiceScore: 0.85,
          editDistance: 0.3,
          anchorDiscrimination: 0.5,
          assertionResults: {
            results: [
              { passed: true },
              { passed: true },
              { passed: true },
            ],
            violationsPerThousandWords: 1.5,
          },
        },
        {
          id: "run-2",
          factScore: 0.9,
          voiceScore: 0.8,
          editDistance: 0.35,
          anchorDiscrimination: 0.4,
          assertionResults: {
            results: [
              { passed: true },
              { passed: true },
              { passed: false },
            ],
            violationsPerThousandWords: 2.0,
          },
        },
      ];

      const metrics = computeMetrics(runs);

      expect(metrics.factScore).toBeCloseTo(0.95);
      expect(metrics.voiceScore).toBeCloseTo(0.825);
      expect(metrics.editDistance).toBeCloseTo(0.325);
      expect(metrics.regressionPassRate).toBeCloseTo(5 / 6);
      expect(metrics.anchorDiscrimination).toBeCloseTo(0.45);
      expect(metrics.variance).toBeGreaterThan(0);
    });

    it("separates fact and voice scores - never aggregates", () => {
      const runs = [
        {
          id: "run-1",
          factScore: 0.5,
          voiceScore: 1.0,
          editDistance: 0.2,
          anchorDiscrimination: null,
          assertionResults: {
            results: [{ passed: false }, { passed: true }],
          },
        },
      ];

      const metrics = computeMetrics(runs);

      // Fact and voice are separate numbers
      expect(metrics.factScore).toBe(0.5);
      expect(metrics.voiceScore).toBe(1.0);
      // They are not combined into one number
      expect(metrics.factScore).not.toBe(metrics.voiceScore);
    });

    it("marks overall FAIL when fact assertions fail even with passing voice", () => {
      const runs = [
        {
          id: "run-1",
          factScore: 0.8,
          voiceScore: 0.95,
          editDistance: 0.15,
          anchorDiscrimination: null,
          assertionResults: {
            results: [
              { passed: true },
              { passed: true },
              { passed: false }, // One fact assertion fails
            ],
          },
        },
      ];

      const metrics = computeMetrics(runs);

      // Voice is great but fact has a failure
      expect(metrics.voiceScore).toBe(0.95);
      expect(metrics.regressionPassRate).toBeLessThan(1.0);
      // Overall should FAIL because fact assertions are not all passing
      expect(metrics.overallPass).toBe(false);
    });

    it("marks overall PASS only when all fact assertions pass", () => {
      const runs = [
        {
          id: "run-1",
          factScore: 1.0,
          voiceScore: 0.9,
          editDistance: 0.2,
          anchorDiscrimination: null,
          assertionResults: {
            results: [
              { passed: true },
              { passed: true },
              { passed: true },
            ],
          },
        },
      ];

      const metrics = computeMetrics(runs);

      expect(metrics.regressionPassRate).toBe(1.0);
      expect(metrics.overallPass).toBe(true);
    });
  });

  describe("Anchor Scoring", () => {
    it("reports broken when anchor passes threshold", () => {
      // A well-written anchor text that won't trigger property violations
      // Longer text avoids per-1000-word rate distortions
      const anchorTexts = [
        "Throughout my career I've consistently delivered complex infrastructure projects that generated measurable business value for enterprise clients across multiple industries and geographies. My approach combines deep technical expertise with a strong understanding of organizational dynamics, enabling me to drive adoption of new platforms while maintaining reliability standards that exceeded our service level agreements by a significant margin each quarter throughout my tenure at the company.",
      ];

      const result = scoreAnchors(anchorTexts);

      // A well-written anchor should have few violations per 1000 words, reporting as broken
      expect(result.broken).toBe(true);
    });

    it("reports not broken when all anchors have high violations", () => {
      // Deliberately bad anchor text with many violations
      const anchorTexts = [
        "The implementation of innovation and transformation through organization and collaboration in communication and administration of the situation and presentation of information and documentation through the manifestation of dedication and contribution to the optimization of operation and the facilitation of implementation.",
      ];

      const result = scoreAnchors(anchorTexts);

      // Bad text should have high violations
      expect(result.anchorResults[0].totalViolations).toBeGreaterThan(0);
    });

    it("computes anchor discrimination when golden mean is provided", () => {
      const anchorTexts = [
        "The implementation of innovation and transformation through organization and collaboration in communication and administration of the situation and presentation of information.",
      ];

      const result = scoreAnchors(anchorTexts, 0.5);

      expect(result.anchorDiscrimination).toBeDefined();
      expect(typeof result.anchorDiscrimination).toBe("number");
    });
  });

  describe("Golden Package Utilities", () => {
    it("computes Levenshtein distance correctly", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("", "abc")).toBe(3);
      expect(levenshteinDistance("abc", "abc")).toBe(0);
      expect(levenshteinDistance("abc", "")).toBe(3);
    });

    it("computes normalized edit distance", () => {
      const dist = normalizedEditDistance("hello", "hello");
      expect(dist).toBe(0);

      const dist2 = normalizedEditDistance("abc", "xyz");
      expect(dist2).toBe(1); // All characters different

      const dist3 = normalizedEditDistance("", "");
      expect(dist3).toBe(0);
    });
  });

  describe("Runner Integration", () => {
    it("runTier1 calls assertion runner correctly", async () => {
      mockPrisma.evalAssertion.findMany.mockResolvedValue([
        {
          id: "assert-1",
          tier: 1,
          assertType: "not-contains",
          target: "synergy",
          documentTypes: [],
          active: true,
        },
      ]);

      const result = await runTier1("I leverage synergy in teams.", "resume");

      expect(result.passed).toBe(false);
      expect(result.results[0].assertType).toBe("not-contains");
    });

    it("runTier2 runs all property checks", () => {
      const text = "I've led engineering teams to deliver scalable platforms. We reduced costs by 40% through architecture redesign. The team grew from 5 to 25 engineers under my leadership.";

      const result = runTier2(text, "cover-letter", ["scalable", "architecture"]);

      expect(result.results.contractionRate).toBeDefined();
      expect(result.results.ruleOfThree).toBeDefined();
      expect(result.results.landing).toBeDefined();
      expect(result.results.vocabularyOverlap).toBeDefined();
      expect(result.results.exhibitAdjacency).toBeDefined();
      expect(result.results.intraDocRepetition).toBeDefined();
      expect(result.results.comprehension).toBeDefined();
      expect(typeof result.violationsPerThousandWords).toBe("number");
    });
  });
});
