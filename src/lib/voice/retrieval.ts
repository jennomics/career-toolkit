/**
 * Voice Corpus: Topic-Based Passage Retrieval
 *
 * Retrieves VoicePassage records where topics overlap with the given set,
 * filtered to speakerIsUser=true only. Results are ranked by number of
 * matching topics (highest first). Logs retrieval to RetrievalLog.
 */

import { prisma } from "@/lib/db";
import type { VoicePassage } from "@/generated/prisma/client";

const DEFAULT_LIMIT = 10;

/**
 * Retrieves passages matching any of the given topics.
 * Only returns passages where speakerIsUser is true (user-authored voice).
 * Results are ordered by the number of overlapping topics (descending).
 *
 * Logs each retrieval to RetrievalLog with contextBlock "voice-corpus".
 * Returns an empty array if no matches (does not throw).
 */
export async function retrievePassages(
  topics: string[],
  limit: number = DEFAULT_LIMIT,
  sessionId?: string
): Promise<VoicePassage[]> {
  if (topics.length === 0) {
    return [];
  }

  try {
    // Query passages that have any topic overlap and are user-authored
    const passages = await prisma.voicePassage.findMany({
      where: {
        speakerIsUser: true,
        topics: { hasSome: topics },
        // Only include passages from user-authored documents
        sourceDocument: {
          authorship: "user-authored",
        },
      },
    });

    // Rank by number of matching topics (descending)
    const ranked = passages
      .map((passage) => {
        const matchCount = passage.topics.filter((t) =>
          topics.includes(t)
        ).length;
        return { passage, matchCount };
      })
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, limit)
      .map((item) => item.passage);

    // Log retrieval if sessionId provided
    if (sessionId) {
      await prisma.retrievalLog.create({
        data: {
          sessionId,
          contextBlock: "voice-corpus",
          success: true,
          tokenCount: ranked.reduce(
            (sum, p) => sum + Math.ceil(p.passageText.length / 4),
            0
          ),
          truncated: passages.length > limit,
        },
      });
    }

    return ranked;
  } catch (err) {
    // Log failure if sessionId provided
    if (sessionId) {
      await prisma.retrievalLog.create({
        data: {
          sessionId,
          contextBlock: "voice-corpus",
          success: false,
          tokenCount: null,
          truncated: false,
          error: err instanceof Error ? err.message : "Unknown error",
        },
      });
    }
    // Never throw from retrieval - return empty array
    return [];
  }
}
