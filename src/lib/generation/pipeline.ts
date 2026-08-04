/**
 * Pipeline Orchestrator
 *
 * Executes the 7-stage generation pipeline in order:
 * 1. PRE-FLIGHT: Check generation readiness
 * 2. CONTEXT ASSEMBLY: Retrieve and log context blocks
 * 3. GENERATION (LLM Call #1): Structured span-attributed output
 * 4. DETERMINISTIC CHECKS: Tier 1 regression assertions
 * 5. CRITIQUE (LLM Call #2): Quality review
 * 6. REVISION (LLM Call #3, conditional): Fix critique issues
 * 7. POST-GENERATION: Record to database
 */

import { prisma } from "@/lib/db";
import { runPreflight } from "./preflight";
import { assembleContext } from "./context";
import { runGeneration } from "./generate";
import { runDeterministicChecks, renderSpansToText } from "./deterministic";
import { runCritique } from "./critique";
import { runRevision } from "./revise";
import {
  PipelineStage,
  type GenerationOptions,
  type PipelineResult,
  type SpanOutput,
  type OverlapInfo,
} from "./types";
import { recordClaimUsage, detectOverlap } from "@/lib/packages/overlap";

/**
 * Runs the full generation pipeline.
 */
export async function runPipeline(
  options: GenerationOptions
): Promise<PipelineResult> {
  const startTime = Date.now();

  // Stage 1: PRE-FLIGHT
  const preflightResult = await runPreflight(options);
  if (!preflightResult.passed || !preflightResult.decomposition) {
    return {
      success: false,
      stage: PipelineStage.PREFLIGHT,
      error: preflightResult.errors.join("; "),
    };
  }

  // Stage 2: CONTEXT ASSEMBLY
  let contextResult;
  try {
    contextResult = await assembleContext(
      preflightResult.decomposition,
      preflightResult.mappedQuestions,
      options.documentType
    );

    // Verify no required block is empty
    const claimsBlock = contextResult.blocks.find((b) => b.name === "claims");
    if (!claimsBlock || claimsBlock.content.length === 0) {
      return {
        success: false,
        stage: PipelineStage.CONTEXT_ASSEMBLY,
        error: "Required context block 'claims' is empty.",
      };
    }

    // Warn if profile block is empty (non-fatal, profile is additive)
    const profileBlock = contextResult.blocks.find((b) => b.name === "profile");
    if (!profileBlock || profileBlock.content.length === 0) {
      console.warn(
        "Warning: profile context block is empty. Generation will proceed without candidate positioning data."
      );
    }
  } catch (err) {
    return {
      success: false,
      stage: PipelineStage.CONTEXT_ASSEMBLY,
      error: err instanceof Error ? err.message : "Context assembly failed",
    };
  }

  // Stage 3: GENERATION (LLM Call #1)
  let generationResult;
  try {
    generationResult = await runGeneration(
      contextResult,
      options.documentType,
      preflightResult.mappedQuestions
    );
  } catch (err) {
    return {
      success: false,
      stage: PipelineStage.GENERATION,
      error: err instanceof Error ? err.message : "Generation failed",
    };
  }

  let finalSpans: SpanOutput[] = generationResult.spans;

  // Stage 4: DETERMINISTIC CHECKS
  const deterministicResult = await runDeterministicChecks(
    finalSpans,
    options.documentType
  );
  if (!deterministicResult.passed) {
    // Tier 1 failure: skip critique and return failure
    return {
      success: false,
      stage: PipelineStage.DETERMINISTIC_CHECKS,
      error: "Deterministic checks failed",
      failures: deterministicResult.failures,
    };
  }

  // Stage 5: CRITIQUE (LLM Call #2)
  let critiquePassed: boolean | null = true;
  try {
    const critiqueResult = await runCritique(finalSpans, options.documentType);

    if (!critiqueResult.passed) {
      critiquePassed = false;

      // Stage 6: REVISION (LLM Call #3, conditional)
      const revisionResult = await runRevision(
        finalSpans,
        critiqueResult.issues,
        options.documentType
      );

      if (!revisionResult.success || !revisionResult.spans) {
        return {
          success: false,
          stage: PipelineStage.REVISION,
          error: revisionResult.error || "Revision failed",
        };
      }

      finalSpans = revisionResult.spans;
      critiquePassed = true; // Revision succeeded
    }
  } catch (err) {
    // If critique itself throws (e.g., network failure, API key issue),
    // record critiquePassed as null to preserve the audit trail.
    // The document already passed deterministic checks so we proceed.
    critiquePassed = null;
    console.error("Critique stage error (non-blocking):", err);
  }

  // Stage 7: POST-GENERATION - Record to database
  const durationMs = Date.now() - startTime;
  const renderedText = renderSpansToText(finalSpans);

  // If packageId is provided, detect overlap before saving
  let overlap: OverlapInfo | undefined;
  if (options.packageId) {
    const claimIds = finalSpans
      .filter((s) => s.claimId)
      .map((s) => s.claimId!);
    const uniqueClaimIds = [...new Set(claimIds)];
    overlap = await detectOverlap(
      options.packageId,
      options.documentType,
      uniqueClaimIds
    );
  }

  try {
    const record = await prisma.generationRecord.create({
      data: {
        documentType: options.documentType,
        jobId: options.jobId,
        packageId: options.packageId || null,
        modelId: generationResult.modelId,
        promptTemplateVersion: generationResult.promptTemplateVersion,
        temperature: generationResult.temperature,
        retrievalSnapshotId: contextResult.sessionId,
        inputTokens: generationResult.inputTokens,
        outputTokens: generationResult.outputTokens,
        durationMs,
        preflightPassed: true,
        critiquePassed,
        structuredOutput: JSON.parse(JSON.stringify(finalSpans)),
        renderedText,
        spans: {
          create: finalSpans.map((span, index) => ({
            spanIndex: index,
            text: span.text,
            claimId: span.claimId,
            modelSupplied: span.modelSupplied,
            disposition: "pending",
          })),
        },
      },
    });

    // If packageId is provided, record claim usage
    if (options.packageId) {
      await recordClaimUsage(options.packageId, record.id);
    }

    return {
      success: true,
      generationId: record.id,
      text: renderedText,
      spans: finalSpans,
      overlap,
    };
  } catch (err) {
    return {
      success: false,
      stage: PipelineStage.POST_GENERATION,
      error: err instanceof Error ? err.message : "Failed to save generation record",
    };
  }
}
