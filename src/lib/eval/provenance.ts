/**
 * Provenance Integrity Tests
 *
 * Verifies the factual integrity of generation outputs:
 * 1. Unretrieved citation detection
 * 2. Model-supplied reuse without verification
 * 3. Freshness expiry checks
 */

import { prisma } from "@/lib/db";

export interface ProvenanceResult {
  passed: boolean;
  detail: string;
}

/**
 * Checks if a generation cites claims that were never successfully retrieved.
 * Loads GenerationSpan rows for the generation, and for each span with a claimId,
 * checks if there is a RetrievalLog with success=true in the same session.
 */
export async function testUnretrievedCitation(
  generationId: string
): Promise<ProvenanceResult> {
  // Load the generation record to get the retrieval session ID
  const generation = await prisma.generationRecord.findUnique({
    where: { id: generationId },
    select: { retrievalSnapshotId: true },
  });

  if (!generation) {
    return { passed: false, detail: `Generation ${generationId} not found` };
  }

  const sessionId = generation.retrievalSnapshotId;

  // Load all spans for this generation
  const spans = await prisma.generationSpan.findMany({
    where: { generationId },
  });

  // Load all successful retrieval logs for this session
  const retrievalLogs = await prisma.retrievalLog.findMany({
    where: { sessionId, success: true },
  });

  const retrievedSourceIds = new Set(
    retrievalLogs
      .map((log) => log.sourceDocumentId)
      .filter((id): id is string => id !== null)
  );

  // For each span with a claimId, check if its claim artifacts link to a retrieved source
  const unretrievedCitations: string[] = [];

  for (const span of spans) {
    if (!span.claimId) continue;

    // Load claim artifacts for this claim
    const artifacts = await prisma.claimArtifact.findMany({
      where: { claimId: span.claimId },
      select: { sourceDocumentId: true },
    });

    // If the claim has source documents, at least one should be in the retrieval logs
    const claimSourceIds = artifacts
      .map((a) => a.sourceDocumentId)
      .filter((id): id is string => id !== null);

    if (claimSourceIds.length > 0) {
      const hasRetrieval = claimSourceIds.some((id) =>
        retrievedSourceIds.has(id)
      );
      if (!hasRetrieval) {
        unretrievedCitations.push(span.claimId);
      }
    }
  }

  if (unretrievedCitations.length > 0) {
    return {
      passed: false,
      detail: `Found ${unretrievedCitations.length} citation(s) with no successful retrieval: ${unretrievedCitations.join(", ")}`,
    };
  }

  return { passed: true, detail: "All citations have successful retrievals" };
}

/**
 * Checks if a model-supplied span's content is reused across 3+ documents
 * without the claim acquiring verified status.
 */
export async function testModelSuppliedReuse(
  claimId: string
): Promise<ProvenanceResult> {
  // Check the claim's current status
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    select: { status: true, statement: true },
  });

  if (!claim) {
    return { passed: false, detail: `Claim ${claimId} not found` };
  }

  // If already verified, it passes
  if (claim.status === "verified") {
    return {
      passed: true,
      detail: "Claim is verified, model-supplied reuse is acceptable",
    };
  }

  // Count distinct documents that use this claim with model-supplied spans
  const spans = await prisma.generationSpan.findMany({
    where: {
      claimId,
      modelSupplied: true,
    },
    select: { generationId: true },
  });

  // Get unique generation IDs and their document types
  const uniqueGenerationIds = [...new Set(spans.map((s) => s.generationId))];

  if (uniqueGenerationIds.length >= 3) {
    return {
      passed: false,
      detail: `Model-supplied claim "${claim.statement}" is reused in ${uniqueGenerationIds.length} documents without verified status`,
    };
  }

  return {
    passed: true,
    detail: `Claim used in ${uniqueGenerationIds.length} document(s), below reuse threshold`,
  };
}

/**
 * Checks if an external claim has a ClaimArtifact with freshnessWindow set
 * and ingestionDate + freshnessWindow days < now() (expired).
 */
export async function testFreshnessExpiry(
  claimId: string
): Promise<ProvenanceResult> {
  const artifacts = await prisma.claimArtifact.findMany({
    where: { claimId },
    select: { freshnessWindow: true, ingestionDate: true, id: true },
  });

  if (artifacts.length === 0) {
    return { passed: true, detail: "No artifacts found for claim" };
  }

  const now = new Date();
  const expired: string[] = [];

  for (const artifact of artifacts) {
    if (artifact.freshnessWindow === null) continue;

    const expiryDate = new Date(artifact.ingestionDate);
    expiryDate.setDate(expiryDate.getDate() + artifact.freshnessWindow);

    if (expiryDate < now) {
      expired.push(artifact.id);
    }
  }

  if (expired.length > 0) {
    return {
      passed: false,
      detail: `${expired.length} artifact(s) have expired freshness windows: ${expired.join(", ")}`,
    };
  }

  return { passed: true, detail: "All artifacts within freshness window" };
}
