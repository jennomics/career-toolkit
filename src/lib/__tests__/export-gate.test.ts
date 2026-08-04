import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockPrisma = {
  applicationPackage: {
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
import {
  exportPackage,
  renderPlainText,
} from "../packages/export";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSpan(overrides: Record<string, unknown> = {}) {
  return {
    id: "span-1",
    generationId: "gen-1",
    spanIndex: 0,
    text: "This is a test span with some content.",
    claimId: null,
    modelSupplied: false,
    disposition: "accepted",
    claim: null,
    ...overrides,
  };
}

function makeGeneration(overrides: Record<string, unknown> = {}) {
  return {
    id: "gen-1",
    documentType: "cover-letter",
    renderedText: "Some rendered text",
    spans: [makeSpan()],
    ...overrides,
  };
}

function makePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: "pkg-1",
    name: "Test Package",
    status: "draft",
    generations: [makeGeneration()],
    ...overrides,
  };
}

/**
 * Generate text of approximately N words for word count testing.
 */
function generateWords(count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push("word");
  }
  return words.join(" ");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Export Gate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Disposition check", () => {
    it("blocks export when model-supplied span has no disposition (null)", async () => {
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                modelSupplied: true,
                disposition: null,
                text: "Model generated content here",
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.blockingIssues.some((i) => i.check === "disposition")
        ).toBe(true);
        const dispositionIssue = result.blockingIssues.find(
          (i) => i.check === "disposition"
        )!;
        expect(dispositionIssue.detail).toContain("has not been reviewed");
        expect(dispositionIssue.resolution).toBeTruthy();
      }
    });

    it("blocks export when model-supplied span has disposition 'pending'", async () => {
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                modelSupplied: true,
                disposition: "pending",
                text: "Pending review content",
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.blockingIssues.some((i) => i.check === "disposition")).toBe(
          true
        );
      }
    });

    it("allows export when model-supplied span has disposition 'accepted'", async () => {
      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                modelSupplied: true,
                disposition: "accepted",
                text,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(true);
    });
  });

  describe("Freshness check", () => {
    it("blocks export when external claim is past freshness window", async () => {
      // Ingestion date 100 days ago, window is 30 days => expired
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 100);

      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                claimId: "claim-1",
                disposition: "accepted",
                text,
                claim: {
                  id: "claim-1",
                  artifacts: [
                    {
                      id: "artifact-1",
                      ingestionDate: pastDate,
                      freshnessWindow: 30,
                      sourceDocumentId: null,
                      sourceDocument: null,
                    },
                  ],
                },
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.blockingIssues.some((i) => i.check === "freshness")).toBe(
          true
        );
        expect(result.blockingIssues[0].detail).toContain("expired artifact");
        expect(result.blockingIssues[0].resolution).toContain("re-verify");
      }
    });

    it("allows export when claim is within freshness window", async () => {
      // Ingestion date 10 days ago, window is 30 days => still fresh
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                claimId: "claim-1",
                disposition: "accepted",
                text,
                claim: {
                  id: "claim-1",
                  artifacts: [
                    {
                      id: "artifact-1",
                      ingestionDate: recentDate,
                      freshnessWindow: 30,
                      sourceDocumentId: null,
                      sourceDocument: null,
                    },
                  ],
                },
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(true);
    });
  });

  describe("Confidentiality check", () => {
    it("blocks export when confidential claim span is not explicitly accepted", async () => {
      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                claimId: "claim-conf",
                disposition: "pending",
                modelSupplied: false,
                text,
                claim: {
                  id: "claim-conf",
                  artifacts: [
                    {
                      id: "artifact-1",
                      ingestionDate: new Date(),
                      freshnessWindow: null,
                      sourceDocumentId: "doc-1",
                      sourceDocument: {
                        id: "doc-1",
                        confidential: true,
                        currentEmployer: false,
                      },
                    },
                  ],
                },
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.blockingIssues.some((i) => i.check === "confidentiality")
        ).toBe(true);
        expect(result.blockingIssues[0].detail).toContain("confidential");
      }
    });

    it("blocks export when currentEmployer claim span is not explicitly accepted", async () => {
      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                claimId: "claim-emp",
                disposition: null,
                modelSupplied: false,
                text,
                claim: {
                  id: "claim-emp",
                  artifacts: [
                    {
                      id: "artifact-2",
                      ingestionDate: new Date(),
                      freshnessWindow: null,
                      sourceDocumentId: "doc-2",
                      sourceDocument: {
                        id: "doc-2",
                        confidential: false,
                        currentEmployer: true,
                      },
                    },
                  ],
                },
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.blockingIssues.some((i) => i.check === "confidentiality")
        ).toBe(true);
        expect(result.blockingIssues[0].detail).toContain("current-employer");
      }
    });

    it("allows export when confidential claim span is explicitly accepted", async () => {
      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                claimId: "claim-conf",
                disposition: "accepted",
                text,
                claim: {
                  id: "claim-conf",
                  artifacts: [
                    {
                      id: "artifact-1",
                      ingestionDate: new Date(),
                      freshnessWindow: null,
                      sourceDocumentId: "doc-1",
                      sourceDocument: {
                        id: "doc-1",
                        confidential: true,
                        currentEmployer: false,
                      },
                    },
                  ],
                },
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(true);
    });
  });

  describe("Format validation", () => {
    it("blocks export when cover-letter exceeds word count limit", async () => {
      const text = generateWords(350); // Over 300 word limit
      const pkg = makePackage({
        generations: [
          makeGeneration({
            documentType: "cover-letter",
            spans: [
              makeSpan({
                disposition: "accepted",
                text,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.blockingIssues.some((i) => i.check === "format")).toBe(
          true
        );
        expect(result.blockingIssues[0].detail).toContain("350 words");
        expect(result.blockingIssues[0].detail).toContain("250-300");
      }
    });

    it("blocks export when cover-letter is below word count limit", async () => {
      const text = generateWords(200); // Under 250 word limit
      const pkg = makePackage({
        generations: [
          makeGeneration({
            documentType: "cover-letter",
            spans: [
              makeSpan({
                disposition: "accepted",
                text,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.blockingIssues.some((i) => i.check === "format")).toBe(
          true
        );
        expect(result.blockingIssues[0].detail).toContain("200 words");
      }
    });

    it("does not check word count for resume type", async () => {
      const text = generateWords(1000); // Very long but no limit for resume
      const pkg = makePackage({
        generations: [
          makeGeneration({
            documentType: "resume",
            spans: [
              makeSpan({
                disposition: "accepted",
                text,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(true);
    });
  });

  describe("Successful export", () => {
    it("returns formatted content when all checks pass", async () => {
      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            documentType: "cover-letter",
            spans: [
              makeSpan({
                disposition: "accepted",
                text,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toBeTruthy();
        expect(result.format).toBe("text");
      }
    });

    it("returns markdown format when requested", async () => {
      const text = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            documentType: "cover-letter",
            spans: [
              makeSpan({
                disposition: "accepted",
                text,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "markdown");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).toContain("# Cover Letter");
        expect(result.format).toBe("markdown");
      }
    });
  });

  describe("Rejected spans excluded", () => {
    it("excludes rejected spans from exported content", async () => {
      const acceptedText = generateWords(275);
      const pkg = makePackage({
        generations: [
          makeGeneration({
            documentType: "cover-letter",
            spans: [
              makeSpan({
                id: "span-accepted",
                disposition: "accepted",
                text: acceptedText,
                spanIndex: 0,
              }),
              makeSpan({
                id: "span-rejected",
                disposition: "rejected",
                text: "THIS_SHOULD_NOT_APPEAR_IN_EXPORT",
                spanIndex: 1,
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.content).not.toContain("THIS_SHOULD_NOT_APPEAR_IN_EXPORT");
      }
    });
  });

  describe("Plain text rendering", () => {
    it("strips markdown artifacts from plain text output", () => {
      const generations = [
        {
          id: "gen-1",
          documentType: "cover-letter",
          renderedText: "",
          spans: [
            {
              id: "s1",
              generationId: "gen-1",
              spanIndex: 0,
              text: "This has **bold** and ## Heading content",
              claimId: null,
              modelSupplied: false,
              disposition: "accepted",
              claim: null,
            },
          ],
        },
      ];

      const result = renderPlainText(generations);

      expect(result).not.toContain("**");
      expect(result).not.toContain("##");
      expect(result).toContain("bold");
      expect(result).toContain("Heading content");
    });

    it("replaces smart quotes with straight quotes", () => {
      const generations = [
        {
          id: "gen-1",
          documentType: "resume",
          renderedText: "",
          spans: [
            {
              id: "s1",
              generationId: "gen-1",
              spanIndex: 0,
              text: "She said \u201CHello\u201D and it\u2019s fine",
              claimId: null,
              modelSupplied: false,
              disposition: "accepted",
              claim: null,
            },
          ],
        },
      ];

      const result = renderPlainText(generations);

      expect(result).not.toMatch(/[\u2018\u2019\u201C\u201D]/);
      expect(result).toContain('"Hello"');
      expect(result).toContain("it's fine");
    });
  });

  describe("Blocking issues structure", () => {
    it("returns blocking issues with check, detail, and resolution fields", async () => {
      const pkg = makePackage({
        generations: [
          makeGeneration({
            spans: [
              makeSpan({
                modelSupplied: true,
                disposition: null,
                text: "Unreviewed model content",
              }),
            ],
          }),
        ],
      });

      mockPrisma.applicationPackage.findUnique.mockResolvedValue(pkg);

      const result = await exportPackage("pkg-1", "text");

      expect(result.success).toBe(false);
      if (!result.success) {
        for (const issue of result.blockingIssues) {
          expect(issue).toHaveProperty("check");
          expect(issue).toHaveProperty("detail");
          expect(issue).toHaveProperty("resolution");
          expect(typeof issue.check).toBe("string");
          expect(typeof issue.detail).toBe("string");
          expect(typeof issue.resolution).toBe("string");
        }
      }
    });
  });
});
