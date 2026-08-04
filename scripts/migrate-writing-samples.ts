#!/usr/bin/env npx tsx
/**
 * Script: Migrate WritingSamples to SourceDocument + VoicePassage
 *
 * Usage: npx tsx scripts/migrate-writing-samples.ts
 *
 * This script migrates existing WritingSample records to the new voice corpus
 * system. Each WritingSample becomes a SourceDocument (category: work-artifact,
 * authorship: user-authored) with associated VoicePassages.
 *
 * Old WritingSample data is NOT deleted.
 * Running this script multiple times is safe (idempotent via title matching).
 */

import { migrateWritingSamples } from "../src/lib/voice/migration";

async function main() {
  console.log("Starting WritingSample migration...\n");

  const result = await migrateWritingSamples();

  console.log("Migration complete:");
  console.log(`  Migrated: ${result.migrated}`);
  console.log(`  Skipped (already migrated): ${result.skipped}`);
  console.log(`  Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
