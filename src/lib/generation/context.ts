/**
 * Stage 2: Context Assembly + Retrieval Logging
 *
 * Assembles context blocks for generation and logs each retrieval.
 * Every retrieval creates a RetrievalLog entry with sessionId, contextBlock,
 * success, tokenCount, and truncated flag.
 */

import { prisma } from "@/lib/db";
import {
  getProfileContext,
  formatProfileForResume,
  formatProfileForCoverLetter,
} from "@/lib/profile-context";
import { retrievePassages } from "@/lib/voice/retrieval";
import type {
  ContextAssemblyResult,
  ContextBlock,
  DecompositionData,
  DocumentType,
  MappedQuestion,
} from "./types";

/**
 * Estimates token count from text length (approx 4 chars per token).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generates a session ID for grouping retrieval logs.
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Logs a retrieval to the database.
 */
async function logRetrieval(
  sessionId: string,
  contextBlock: string,
  success: boolean,
  tokenCount: number | null,
  truncated: boolean,
  error?: string
): Promise<void> {
  await prisma.retrievalLog.create({
    data: {
      sessionId,
      contextBlock,
      success,
      tokenCount,
      truncated,
      error: error ?? null,
    },
  });
}

export async function assembleContext(
  decomposition: DecompositionData,
  mappedQuestions: MappedQuestion[],
  documentType: DocumentType
): Promise<ContextAssemblyResult> {
  const sessionId = generateSessionId();
  const blocks: ContextBlock[] = [];

  // 1. Retrieve claims by question relevance
  const allClaimIds = new Set<string>();
  for (const q of mappedQuestions) {
    for (const id of q.claimIds) {
      allClaimIds.add(id);
    }
  }

  let claims: Array<{ id: string; statement: string; category: string }> = [];
  try {
    if (allClaimIds.size > 0) {
      claims = await prisma.claim.findMany({
        where: { id: { in: Array.from(allClaimIds) } },
        select: { id: true, statement: true, category: true },
      });
    }

    const claimsContent = claims
      .map((c) => `[${c.id}] (${c.category}) ${c.statement}`)
      .join("\n");
    const claimsTokenCount = estimateTokens(claimsContent);

    blocks.push({
      name: "claims",
      content: claimsContent,
      tokenCount: claimsTokenCount,
      truncated: false,
    });

    await logRetrieval(sessionId, "claims", true, claimsTokenCount, false);
  } catch (err) {
    blocks.push({ name: "claims", content: "", tokenCount: 0, truncated: false });
    await logRetrieval(
      sessionId,
      "claims",
      false,
      null,
      false,
      err instanceof Error ? err.message : "Unknown error"
    );
  }

  // 2. Retrieve profile context
  let profileContext = "";
  try {
    const profile = await getProfileContext();
    if (profile) {
      if (documentType === "resume") {
        profileContext = formatProfileForResume(profile);
      } else if (documentType === "cover-letter" || documentType === "essay") {
        // For cover letter, we need job info for story selection
        profileContext = formatProfileForCoverLetter(profile, {
          title: decomposition.responsibilities[0] || "",
          company: "",
          description: decomposition.problemStatement,
        });
      } else {
        profileContext = formatProfileForResume(profile);
      }
    }

    const profileTokenCount = estimateTokens(profileContext);
    blocks.push({
      name: "profile",
      content: profileContext,
      tokenCount: profileTokenCount,
      truncated: false,
    });

    await logRetrieval(sessionId, "profile", true, profileTokenCount, false);
  } catch (err) {
    blocks.push({ name: "profile", content: "", tokenCount: 0, truncated: false });
    await logRetrieval(
      sessionId,
      "profile",
      false,
      null,
      false,
      err instanceof Error ? err.message : "Unknown error"
    );
  }

  // 3. Assemble decomposition context block
  const decompositionContent = [
    `Problem Statement: ${decomposition.problemStatement}`,
    `Responsibilities: ${decomposition.responsibilities.join(", ")}`,
    `Stated Bars: ${decomposition.statedBars.join(", ")}`,
    `Vocabulary: ${decomposition.vocabulary.join(", ")}`,
  ].join("\n");

  const decompositionTokenCount = estimateTokens(decompositionContent);
  blocks.push({
    name: "decomposition",
    content: decompositionContent,
    tokenCount: decompositionTokenCount,
    truncated: false,
  });

  await logRetrieval(sessionId, "decomposition", true, decompositionTokenCount, false);

  // 4. Retrieve voice-corpus passages by topic overlap
  try {
    // Derive topics from decomposition vocabulary words (these are real domain terms
    // that match the hyphenated topic tags GPT-4o-mini assigns during ingestion)
    const voiceTopics = decomposition.vocabulary
      .map((v) => v.toLowerCase().trim())
      .filter((t) => t.length > 0);

    const passages = await retrievePassages(voiceTopics, 10, sessionId);

    const voiceContent = passages
      .map((p) => p.passageText)
      .join("\n\n");
    const voiceTokenCount = estimateTokens(voiceContent);

    blocks.push({
      name: "voice-corpus",
      content: voiceContent,
      tokenCount: voiceTokenCount,
      truncated: false,
    });
  } catch (err) {
    blocks.push({ name: "voice-corpus", content: "", tokenCount: 0, truncated: false });
    await logRetrieval(
      sessionId,
      "voice-corpus",
      false,
      null,
      false,
      err instanceof Error ? err.message : "Unknown error"
    );
  }

  return {
    sessionId,
    blocks,
    claims,
    profileContext,
    decomposition,
  };
}
