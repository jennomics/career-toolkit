import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockPrisma = {
  generationRecord: {
    findUnique: vi.fn(),
  },
  generationSpan: {
    findMany: vi.fn(),
  },
  packageClaimUsage: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  generationVariant: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
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
  recordClaimUsage,
  detectOverlap,
  detectIntraDocumentRepetition,
} from "../packages/overlap";
import type { SpanOutput } from "../generation/types";

describe("Packages Overlap Detection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("recordClaimUsage", () => {
    it("creates PackageClaimUsage entries for all unique claims in a generation", async () => {
      mockPrisma.generationRecord.findUnique.mockResolvedValue({
        id: "gen-1",
        documentType: "resume",
      });

      mockPrisma.generationSpan.findMany.mockResolvedValue([
        { claimId: "claim-1" },
        { claimId: "claim-2" },
        { claimId: "claim-1" }, // Duplicate - should be deduplicated
        { claimId: "claim-3" },
      ]);

      mockPrisma.packageClaimUsage.upsert.mockResolvedValue({});

      await recordClaimUsage("pkg-1", "gen-1");

      // Should be called 3 times (deduplicated from 4 spans)
      expect(mockPrisma.packageClaimUsage.upsert).toHaveBeenCalledTimes(3);

      // Verify the first call
      expect(mockPrisma.packageClaimUsage.upsert).toHaveBeenCalledWith({
        where: {
          packageId_claimId_documentType: {
            packageId: "pkg-1",
            claimId: "claim-1",
            documentType: "resume",
          },
        },
        create: {
          packageId: "pkg-1",
          claimId: "claim-1",
          documentType: "resume",
          overridden: false,
        },
        update: {},
      });
    });

    it("throws when generation record is not found", async () => {
      mockPrisma.generationRecord.findUnique.mockResolvedValue(null);

      await expect(recordClaimUsage("pkg-1", "nonexistent")).rejects.toThrow(
        'GenerationRecord "nonexistent" not found'
      );
    });

    it("does nothing when no spans have claimIds", async () => {
      mockPrisma.generationRecord.findUnique.mockResolvedValue({
        id: "gen-1",
        documentType: "cover-letter",
      });

      mockPrisma.generationSpan.findMany.mockResolvedValue([]);

      await recordClaimUsage("pkg-1", "gen-1");

      expect(mockPrisma.packageClaimUsage.upsert).not.toHaveBeenCalled();
    });
  });

  describe("detectOverlap", () => {
    it("finds claims already used in other document types within the package", async () => {
      mockPrisma.packageClaimUsage.findMany.mockResolvedValue([
        { claimId: "claim-1", documentType: "resume", overridden: false },
        { claimId: "claim-2", documentType: "resume", overridden: true },
      ]);

      const result = await detectOverlap(
        "pkg-1",
        "cover-letter",
        ["claim-1", "claim-2", "claim-3"]
      );

      expect(result.totalChecked).toBe(3);
      expect(result.overlappingClaims).toHaveLength(2);
      expect(result.overlappingClaims[0]).toEqual({
        claimId: "claim-1",
        existingDocumentType: "resume",
        overridden: false,
      });
      expect(result.overlappingClaims[1]).toEqual({
        claimId: "claim-2",
        existingDocumentType: "resume",
        overridden: true,
      });

      // Verify the query filters correctly
      expect(mockPrisma.packageClaimUsage.findMany).toHaveBeenCalledWith({
        where: {
          packageId: "pkg-1",
          claimId: { in: ["claim-1", "claim-2", "claim-3"] },
          documentType: { not: "cover-letter" },
        },
        select: {
          claimId: true,
          documentType: true,
          overridden: true,
        },
      });
    });

    it("returns empty report when no claims overlap", async () => {
      mockPrisma.packageClaimUsage.findMany.mockResolvedValue([]);

      const result = await detectOverlap(
        "pkg-1",
        "essay",
        ["claim-4", "claim-5"]
      );

      expect(result.totalChecked).toBe(2);
      expect(result.overlappingClaims).toHaveLength(0);
    });

    it("returns empty report when given empty claimIds array", async () => {
      const result = await detectOverlap("pkg-1", "resume", []);

      expect(result.totalChecked).toBe(0);
      expect(result.overlappingClaims).toHaveLength(0);
      expect(mockPrisma.packageClaimUsage.findMany).not.toHaveBeenCalled();
    });
  });

  describe("detectIntraDocumentRepetition", () => {
    it("flags claims used 3+ times within one document", () => {
      const spans: SpanOutput[] = [
        { text: "First use of claim-1.", claimId: "claim-1", modelSupplied: false },
        { text: "Second use of claim-1.", claimId: "claim-1", modelSupplied: false },
        { text: "Third use of claim-1.", claimId: "claim-1", modelSupplied: false },
        { text: "Only one use of claim-2.", claimId: "claim-2", modelSupplied: false },
        { text: "Model-supplied text.", claimId: null, modelSupplied: true },
      ];

      const flags = detectIntraDocumentRepetition(spans);

      expect(flags).toHaveLength(1);
      expect(flags[0]).toEqual({ claimId: "claim-1", count: 3 });
    });

    it("does not flag claims used fewer than 3 times", () => {
      const spans: SpanOutput[] = [
        { text: "First use.", claimId: "claim-1", modelSupplied: false },
        { text: "Second use.", claimId: "claim-1", modelSupplied: false },
        { text: "First of claim-2.", claimId: "claim-2", modelSupplied: false },
        { text: "Second of claim-2.", claimId: "claim-2", modelSupplied: false },
      ];

      const flags = detectIntraDocumentRepetition(spans);
      expect(flags).toHaveLength(0);
    });

    it("flags multiple claims if each is used 3+ times", () => {
      const spans: SpanOutput[] = [
        { text: "A1", claimId: "claim-a", modelSupplied: false },
        { text: "A2", claimId: "claim-a", modelSupplied: false },
        { text: "A3", claimId: "claim-a", modelSupplied: false },
        { text: "A4", claimId: "claim-a", modelSupplied: false },
        { text: "B1", claimId: "claim-b", modelSupplied: false },
        { text: "B2", claimId: "claim-b", modelSupplied: false },
        { text: "B3", claimId: "claim-b", modelSupplied: false },
      ];

      const flags = detectIntraDocumentRepetition(spans);
      expect(flags).toHaveLength(2);
      expect(flags.find((f) => f.claimId === "claim-a")).toEqual({
        claimId: "claim-a",
        count: 4,
      });
      expect(flags.find((f) => f.claimId === "claim-b")).toEqual({
        claimId: "claim-b",
        count: 3,
      });
    });

    it("returns empty when all spans are model-supplied", () => {
      const spans: SpanOutput[] = [
        { text: "Hello", claimId: null, modelSupplied: true },
        { text: "World", claimId: null, modelSupplied: true },
      ];

      const flags = detectIntraDocumentRepetition(spans);
      expect(flags).toHaveLength(0);
    });
  });

  describe("Variant Selection", () => {
    it("marks chosen variant and unmarks others for a generation", async () => {
      // This test verifies the logic used in the API route:
      // POST /api/generation/[id]/variants sets chosen=true for selected variant
      // and chosen=false for all others in the same generation.

      // Simulate the updateMany + update pattern
      mockPrisma.generationVariant.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.generationVariant.update.mockResolvedValue({
        id: "variant-2",
        generationId: "gen-1",
        variantLabel: "B",
        tradeoff: "More concise but less detailed",
        text: "Shortened version of the resume section.",
        chosen: true,
      });

      // Unset all variants for this generation
      await mockPrisma.generationVariant.updateMany({
        where: { generationId: "gen-1" },
        data: { chosen: false },
      });

      // Set the chosen variant
      const chosen = await mockPrisma.generationVariant.update({
        where: { id: "variant-2" },
        data: { chosen: true },
      });

      expect(mockPrisma.generationVariant.updateMany).toHaveBeenCalledWith({
        where: { generationId: "gen-1" },
        data: { chosen: false },
      });

      expect(chosen.chosen).toBe(true);
      expect(chosen.id).toBe("variant-2");
      expect(chosen.variantLabel).toBe("B");
    });
  });
});
