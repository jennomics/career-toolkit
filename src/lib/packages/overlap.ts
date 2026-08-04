/**
 * Cross-Document Overlap Detection for Application Packages.
 *
 * Tracks which claims are used across documents within a package,
 * detects when a claim has been used in one document type and is about
 * to be reused in a sibling document, and flags intra-document repetition
 * when a single claim appears 3+ times.
 */

import { prisma } from "@/lib/db";
import type { SpanOutput } from "@/lib/generation/types";

export interface OverlapEntry {
  claimId: string;
  existingDocumentType: string;
  overridden: boolean;
}

export interface OverlapReport {
  overlappingClaims: OverlapEntry[];
  totalChecked: number;
}

export interface RepetitionFlag {
  claimId: string;
  count: number;
}

/**
 * Scans GenerationSpan rows for a generation and creates PackageClaimUsage
 * entries for all claims used in that generation.
 */
export async function recordClaimUsage(
  packageId: string,
  generationId: string
): Promise<void> {
  // Fetch the generation to get its documentType
  const generation = await prisma.generationRecord.findUnique({
    where: { id: generationId },
    select: { documentType: true },
  });

  if (!generation) {
    throw new Error(`GenerationRecord "${generationId}" not found`);
  }

  // Fetch all spans with non-null claimIds
  const spans = await prisma.generationSpan.findMany({
    where: {
      generationId,
      claimId: { not: null },
    },
    select: { claimId: true },
  });

  // Deduplicate claimIds
  const uniqueClaimIds = [...new Set(spans.map((s) => s.claimId!))];

  if (uniqueClaimIds.length === 0) return;

  // Upsert each claim usage (skip duplicates via unique constraint)
  for (const claimId of uniqueClaimIds) {
    await prisma.packageClaimUsage.upsert({
      where: {
        packageId_claimId_documentType: {
          packageId,
          claimId,
          documentType: generation.documentType,
        },
      },
      create: {
        packageId,
        claimId,
        documentType: generation.documentType,
        overridden: false,
      },
      update: {}, // No-op if already exists
    });
  }
}

/**
 * Checks which claims from the given list are already used in other
 * document types within the same package. Returns an overlap report.
 */
export async function detectOverlap(
  packageId: string,
  documentType: string,
  claimIds: string[]
): Promise<OverlapReport> {
  if (claimIds.length === 0) {
    return { overlappingClaims: [], totalChecked: 0 };
  }

  // Find claims already used in this package but for a different document type
  const existingUsages = await prisma.packageClaimUsage.findMany({
    where: {
      packageId,
      claimId: { in: claimIds },
      documentType: { not: documentType },
    },
    select: {
      claimId: true,
      documentType: true,
      overridden: true,
    },
  });

  const overlappingClaims: OverlapEntry[] = existingUsages.map((usage) => ({
    claimId: usage.claimId,
    existingDocumentType: usage.documentType,
    overridden: usage.overridden,
  }));

  return {
    overlappingClaims,
    totalChecked: claimIds.length,
  };
}

/**
 * Scans spans for intra-document repetition. Flags any claim used 3+ times
 * within a single document (same generation output).
 */
export function detectIntraDocumentRepetition(
  spans: SpanOutput[]
): RepetitionFlag[] {
  const claimCounts = new Map<string, number>();

  for (const span of spans) {
    if (span.claimId) {
      claimCounts.set(span.claimId, (claimCounts.get(span.claimId) || 0) + 1);
    }
  }

  const flags: RepetitionFlag[] = [];
  for (const [claimId, count] of claimCounts) {
    if (count >= 3) {
      flags.push({ claimId, count });
    }
  }

  return flags;
}
