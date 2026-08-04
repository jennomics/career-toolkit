/**
 * Voice Corpus: WritingSample Migration
 *
 * Migrates existing WritingSample records to SourceDocument + VoicePassage.
 * Each WritingSample becomes a SourceDocument with category "work-artifact"
 * and authorship "user-authored", then is ingested into VoicePassages.
 *
 * Old WritingSample data is NOT deleted.
 * getVoiceGuidance logs a deprecation warning.
 */

import { prisma } from "@/lib/db";
import { ingestDocument } from "./passages";

export interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Migrates all WritingSample records to SourceDocument + VoicePassage.
 * Skips samples that have already been migrated (matched by title).
 */
export async function migrateWritingSamples(): Promise<MigrationResult> {
  const result: MigrationResult = { migrated: 0, skipped: 0, errors: [] };

  const profiles = await prisma.candidateProfile.findMany({
    include: { writingSamples: true },
  });

  for (const profile of profiles) {
    for (const sample of profile.writingSamples) {
      try {
        // Check if already migrated (by title + content match for robustness)
        const existing = await prisma.sourceDocument.findFirst({
          where: {
            title: sample.title,
            content: sample.content,
            category: "work-artifact",
            authorship: "user-authored",
          },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        // Create SourceDocument from WritingSample
        const doc = await prisma.sourceDocument.create({
          data: {
            title: sample.title,
            content: sample.content,
            category: "work-artifact",
            authorship: "user-authored",
            documentDate: sample.createdAt,
            confidential: false,
            currentEmployer: false,
          },
        });

        // Ingest the document into passages
        await ingestDocument(doc.id);
        result.migrated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`Failed to migrate "${sample.title}": ${msg}`);
      }
    }
  }

  return result;
}
