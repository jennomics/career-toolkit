/**
 * Voice Corpus: Passage Chunking + Topic Inference
 *
 * - chunkDocument: splits document content at paragraph boundaries
 *   (min 50 chars, max 500 chars with sentence-boundary splitting)
 * - inferTopics: calls GPT-4o-mini to assign 1-3 topic tags per passage
 * - ingestDocument: loads document, chunks, infers topics, creates VoicePassage rows
 *   Idempotent: deletes existing passages for the document before re-creating.
 */

import { prisma } from "@/lib/db";
import { guardedLLMCall } from "@/lib/guarded-llm";
import { llmSemaphore } from "@/lib/llm-guard";

const MIN_PASSAGE_LENGTH = 50;
const MAX_PASSAGE_LENGTH = 500;

/**
 * Splits text at sentence boundaries, trying to keep chunks under maxLen.
 */
function splitAtSentenceBoundaries(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g);
  if (!sentences) {
    // No sentence boundaries found, return the text as-is
    return [text.trim()];
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxLen && current.length >= MIN_PASSAGE_LENGTH) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Chunks a document into passages at paragraph boundaries.
 * - Paragraphs shorter than 50 characters are skipped (headings, empty lines).
 * - Paragraphs longer than 500 characters are split at sentence boundaries.
 */
export function chunkDocument(content: string): string[] {
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim());
  const passages: string[] = [];

  for (const para of paragraphs) {
    if (para.length < MIN_PASSAGE_LENGTH) {
      continue; // Skip short paragraphs (headings, whitespace)
    }

    if (para.length <= MAX_PASSAGE_LENGTH) {
      passages.push(para);
    } else {
      // Split at sentence boundaries
      const chunks = splitAtSentenceBoundaries(para, MAX_PASSAGE_LENGTH);
      for (const chunk of chunks) {
        if (chunk.length >= MIN_PASSAGE_LENGTH) {
          passages.push(chunk);
        }
      }
    }
  }

  return passages;
}

/**
 * Uses GPT-4o-mini to assign 1-3 topic tags to a passage.
 * Returns an array of lowercase topic strings.
 */
export async function inferTopics(passage: string): Promise<string[]> {
  const response = await guardedLLMCall({
    model: "gpt-4o-mini",
    temperature: 0.2,
    jsonMode: true,
    messages: [
      {
        role: "system",
        content:
          "You are a topic-tagging assistant. Given a text passage, assign 1-3 concise topic tags that describe what the passage is about. " +
          "Topics should be lowercase, hyphenated phrases (e.g., 'team-leadership', 'data-analysis', 'project-management'). " +
          "Return JSON: { \"topics\": [\"topic-1\", \"topic-2\"] }",
      },
      {
        role: "user",
        content: `Assign 1-3 topic tags to this passage:\n\n${passage}`,
      },
    ],
  });

  try {
    const parsed = JSON.parse(response);
    const topics: string[] = Array.isArray(parsed.topics) ? parsed.topics : [];
    // Ensure 1-3 topics, lowercase, trimmed
    return topics
      .slice(0, 3)
      .map((t: string) => t.toLowerCase().trim())
      .filter((t: string) => t.length > 0);
  } catch {
    // Log the failure so operators can diagnose unretrievable passages
    console.warn(
      `[voice/inferTopics] Failed to parse LLM topic response for passage (first 80 chars): "${passage.slice(0, 80)}"`
    );
    return [];
  }
}

/**
 * Ingests a document: loads it, chunks the content, infers topics for each passage,
 * and creates VoicePassage records. Idempotent: deletes old passages first.
 */
export async function ingestDocument(documentId: string): Promise<void> {
  const document = await prisma.sourceDocument.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Delete existing passages for idempotency
  await prisma.voicePassage.deleteMany({
    where: { sourceDocumentId: documentId },
  });

  // Chunk the document content
  const chunks = chunkDocument(document.content);

  // Determine speakerIsUser based on authorship
  const speakerIsUser = document.authorship === "user-authored";

  // Infer topics and create passages with concurrency control
  const processChunk = async (chunk: string): Promise<void> => {
    await llmSemaphore.acquire();
    try {
      const topics = await inferTopics(chunk);

      await prisma.voicePassage.create({
        data: {
          sourceDocumentId: documentId,
          passageText: chunk,
          topics,
          speakerIsUser,
        },
      });
    } finally {
      llmSemaphore.release();
    }
  };

  await Promise.allSettled(chunks.map(processChunk));
}
