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
  sourceDocument: {
    findUnique: vi.fn(),
  },
  voicePassage: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  retrievalLog: {
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

import { chunkDocument, inferTopics, ingestDocument } from "../voice/passages";
import { retrievePassages } from "../voice/retrieval";

describe("chunkDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("splits at paragraph boundaries", () => {
    const content = [
      "This is the first paragraph with enough characters to pass the minimum length threshold of fifty characters.",
      "",
      "This is the second paragraph with enough characters to also pass the minimum length threshold requirement.",
    ].join("\n");

    const result = chunkDocument(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("first paragraph");
    expect(result[1]).toContain("second paragraph");
  });

  it("skips paragraphs shorter than 50 characters", () => {
    const content = [
      "Short heading",
      "",
      "This is a paragraph with enough characters to pass the minimum length threshold of fifty characters easily.",
      "",
      "Tiny",
    ].join("\n");

    const result = chunkDocument(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("enough characters");
  });

  it("splits long paragraphs at sentence boundaries", () => {
    // Create a paragraph that exceeds 500 chars
    const longSentences = [
      "This is a fairly long sentence that has many words in it to help fill up the character count and push us toward the limit.",
      "Here is another sentence that continues the paragraph with additional content and detail about the work we are doing.",
      "And a third sentence that makes the paragraph even longer than before with extra words that are needed.",
      "A fourth sentence to push us over the five hundred character limit for this particular test case we need.",
      "Fifth sentence continues adding more text to this paragraph so that it becomes too long for a single passage.",
      "Sixth sentence is here to ensure we are well over the maximum passage length allowed by the chunking algorithm.",
    ];
    const longParagraph = longSentences.join(" ");
    expect(longParagraph.length).toBeGreaterThan(500);

    const result = chunkDocument(longParagraph);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Each chunk should be under 500 chars (or at least split at boundaries)
    for (const chunk of result) {
      expect(chunk.length).toBeGreaterThanOrEqual(50);
    }
  });

  it("returns empty array for content with only short paragraphs", () => {
    const content = "Hello\n\nWorld\n\nHi";
    const result = chunkDocument(content);
    expect(result).toHaveLength(0);
  });

  it("handles content with no paragraph breaks but long enough", () => {
    const content =
      "This is a single block of text without any paragraph breaks but it is long enough to pass the minimum character threshold.";
    const result = chunkDocument(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(content);
  });
});

describe("inferTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns topics from GPT-4o-mini response", async () => {
    mockGuardedLLMCall.mockResolvedValue(
      JSON.stringify({ topics: ["team-leadership", "project-management"] })
    );

    const result = await inferTopics("Led a team of 5 engineers to deliver a critical project.");
    expect(result).toEqual(["team-leadership", "project-management"]);
    expect(mockGuardedLLMCall).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        jsonMode: true,
      })
    );
  });

  it("limits to 3 topics maximum", async () => {
    mockGuardedLLMCall.mockResolvedValue(
      JSON.stringify({ topics: ["a", "b", "c", "d", "e"] })
    );

    const result = await inferTopics("Some passage text");
    expect(result).toHaveLength(3);
  });

  it("returns empty array on parse failure", async () => {
    mockGuardedLLMCall.mockResolvedValue("not valid json");

    const result = await inferTopics("Some passage text");
    expect(result).toEqual([]);
  });

  it("lowercases and trims topics", async () => {
    mockGuardedLLMCall.mockResolvedValue(
      JSON.stringify({ topics: [" Data-Analysis ", "LEADERSHIP "] })
    );

    const result = await inferTopics("Some passage text");
    expect(result).toEqual(["data-analysis", "leadership"]);
  });
});

describe("ingestDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes existing passages before creating new ones (idempotent)", async () => {
    mockPrisma.sourceDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      content:
        "This is a paragraph that meets the minimum length requirement of fifty characters for passage chunking.",
      authorship: "user-authored",
    });
    mockPrisma.voicePassage.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.voicePassage.create.mockResolvedValue({});
    mockGuardedLLMCall.mockResolvedValue(
      JSON.stringify({ topics: ["testing"] })
    );

    await ingestDocument("doc-1");

    expect(mockPrisma.voicePassage.deleteMany).toHaveBeenCalledWith({
      where: { sourceDocumentId: "doc-1" },
    });
    expect(mockPrisma.voicePassage.create).toHaveBeenCalled();
  });

  it("throws if document not found", async () => {
    mockPrisma.sourceDocument.findUnique.mockResolvedValue(null);

    await expect(ingestDocument("nonexistent")).rejects.toThrow("Document not found");
  });

  it("sets speakerIsUser based on authorship", async () => {
    mockPrisma.sourceDocument.findUnique.mockResolvedValue({
      id: "doc-2",
      content:
        "This is a paragraph that meets the minimum length requirement of fifty characters for passage chunking.",
      authorship: "third-party",
    });
    mockPrisma.voicePassage.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.voicePassage.create.mockResolvedValue({});
    mockGuardedLLMCall.mockResolvedValue(
      JSON.stringify({ topics: ["feedback"] })
    );

    await ingestDocument("doc-2");

    expect(mockPrisma.voicePassage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ speakerIsUser: false }),
    });
  });
});

describe("retrievePassages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no topics provided", async () => {
    const result = await retrievePassages([]);
    expect(result).toEqual([]);
    expect(mockPrisma.voicePassage.findMany).not.toHaveBeenCalled();
  });

  it("queries passages with topic overlap and speakerIsUser=true", async () => {
    mockPrisma.voicePassage.findMany.mockResolvedValue([
      {
        id: "p1",
        passageText: "I led the team",
        topics: ["leadership", "team-management"],
        speakerIsUser: true,
      },
      {
        id: "p2",
        passageText: "Project was delivered on time",
        topics: ["project-management"],
        speakerIsUser: true,
      },
    ]);
    mockPrisma.retrievalLog.create.mockResolvedValue({});

    const result = await retrievePassages(
      ["leadership", "project-management"],
      10,
      "session-1"
    );

    expect(mockPrisma.voicePassage.findMany).toHaveBeenCalledWith({
      where: {
        speakerIsUser: true,
        topics: { hasSome: ["leadership", "project-management"] },
        sourceDocument: { authorship: "user-authored" },
      },
    });
    expect(result).toHaveLength(2);
    // First result should be the one with more topic matches
    expect(result[0].id).toBe("p1"); // 2 matches vs 1
  });

  it("ranks passages by number of matching topics", async () => {
    mockPrisma.voicePassage.findMany.mockResolvedValue([
      {
        id: "p1",
        passageText: "One match",
        topics: ["data"],
        speakerIsUser: true,
      },
      {
        id: "p2",
        passageText: "Two matches",
        topics: ["data", "analysis"],
        speakerIsUser: true,
      },
    ]);
    mockPrisma.retrievalLog.create.mockResolvedValue({});

    const result = await retrievePassages(["data", "analysis"], 10, "session-2");

    expect(result[0].id).toBe("p2");
    expect(result[1].id).toBe("p1");
  });

  it("logs retrieval to RetrievalLog when sessionId provided", async () => {
    mockPrisma.voicePassage.findMany.mockResolvedValue([]);
    mockPrisma.retrievalLog.create.mockResolvedValue({});

    await retrievePassages(["topic-1"], 10, "session-3");

    expect(mockPrisma.retrievalLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-3",
        contextBlock: "voice-corpus",
        success: true,
      }),
    });
  });

  it("returns empty array on error without throwing", async () => {
    mockPrisma.voicePassage.findMany.mockRejectedValue(new Error("DB error"));
    mockPrisma.retrievalLog.create.mockResolvedValue({});

    const result = await retrievePassages(["topic-1"], 10, "session-4");

    expect(result).toEqual([]);
    expect(mockPrisma.retrievalLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
        error: "DB error",
      }),
    });
  });

  it("respects limit parameter", async () => {
    const passages = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      passageText: `Passage ${i}`,
      topics: ["common-topic"],
      speakerIsUser: true,
    }));
    mockPrisma.voicePassage.findMany.mockResolvedValue(passages);
    mockPrisma.retrievalLog.create.mockResolvedValue({});

    const result = await retrievePassages(["common-topic"], 5, "session-5");

    expect(result).toHaveLength(5);
  });
});
