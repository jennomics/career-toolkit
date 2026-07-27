#!/usr/bin/env node
/**
 * Migration Script: SQLite → Neon PostgreSQL
 *
 * Reads all data from local dev.db (SQLite) and writes it to Neon (PostgreSQL).
 * Safe: only READS from SQLite, only WRITES to Neon.
 * Idempotent: skips records that already exist (by ID).
 *
 * Usage:
 *   POSTGRES_PRISMA_URL="postgresql://..." node scripts/migrate-to-neon.mjs
 *
 * Or set POSTGRES_PRISMA_URL in your .env file and run:
 *   node scripts/migrate-to-neon.mjs
 */

import Database from "better-sqlite3";
import pg from "pg";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Load .env from project root
config({ path: resolve(projectRoot, ".env") });

// ─── Configuration ──────────────────────────────────────────────────────────

const SQLITE_PATH = resolve(projectRoot, "dev.db");
const PG_URL =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

// ─── Validation ─────────────────────────────────────────────────────────────

if (!existsSync(SQLITE_PATH)) {
  console.error(`\n  ERROR: SQLite database not found at: ${SQLITE_PATH}`);
  console.error(`  Make sure you're running this from the career-toolkit directory.\n`);
  process.exit(1);
}

if (!PG_URL || !PG_URL.startsWith("postgres")) {
  console.error(`\n  ERROR: No PostgreSQL connection string found.`);
  console.error(`  Set POSTGRES_PRISMA_URL in .env or pass it as an environment variable.`);
  console.error(`  Example: POSTGRES_PRISMA_URL="postgresql://..." node scripts/migrate-to-neon.mjs\n`);
  process.exit(1);
}

// ─── Connect to both databases ──────────────────────────────────────────────

console.log("\n=== Career Toolkit: SQLite → Neon Migration ===\n");
console.log(`  SQLite: ${SQLITE_PATH}`);
console.log(`  Neon:   ${PG_URL.replace(/:[^:@]+@/, ":***@")}`);
console.log("");

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const pgClient = new pg.Client({ connectionString: PG_URL });

await pgClient.connect();
console.log("  Connected to both databases.\n");

// ─── Read from SQLite ───────────────────────────────────────────────────────

const jobs = sqlite.prepare("SELECT * FROM Job").all();
const skills = sqlite.prepare("SELECT * FROM JobSkill").all();
const responsibilities = sqlite.prepare("SELECT * FROM JobResponsibility").all();
const corrections = sqlite.prepare("SELECT * FROM Correction").all();

console.log(`  Found in SQLite:`);
console.log(`    Jobs:              ${jobs.length}`);
console.log(`    Skills:            ${skills.length}`);
console.log(`    Responsibilities:  ${responsibilities.length}`);
console.log(`    Corrections:       ${corrections.length}`);
console.log("");

// ─── Helper: Upsert (skip if exists) ────────────────────────────────────────

async function upsertJob(job) {
  const query = `
    INSERT INTO "Job" (id, title, company, location, url, description, status, source, notes, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (id) DO NOTHING
  `;
  await pgClient.query(query, [
    job.id,
    job.title,
    job.company,
    job.location,
    job.url,
    job.description,
    job.status || "saved",
    job.source,
    job.notes,
    new Date(job.createdAt),
    new Date(job.updatedAt),
  ]);
}

async function upsertSkill(skill) {
  const query = `
    INSERT INTO "JobSkill" (id, name, "jobId")
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO NOTHING
  `;
  await pgClient.query(query, [skill.id, skill.name, skill.jobId]);
}

async function upsertResponsibility(resp) {
  const query = `
    INSERT INTO "JobResponsibility" (id, text, category, "jobId")
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING
  `;
  await pgClient.query(query, [resp.id, resp.text, resp.category, resp.jobId]);
}

async function upsertCorrection(corr) {
  const query = `
    INSERT INTO "Correction" (id, field, "extractedValue", "correctedValue", "rawContext", source, "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
  `;
  await pgClient.query(query, [
    corr.id,
    corr.field,
    corr.extractedValue,
    corr.correctedValue,
    corr.rawContext,
    corr.source,
    new Date(corr.createdAt),
  ]);
}

// ─── Migrate ────────────────────────────────────────────────────────────────

let migrated = { jobs: 0, skills: 0, responsibilities: 0, corrections: 0 };
let skipped = { jobs: 0, skills: 0, responsibilities: 0, corrections: 0 };

console.log("  Migrating jobs...");
for (const job of jobs) {
  try {
    const before = await pgClient.query('SELECT id FROM "Job" WHERE id = $1', [job.id]);
    if (before.rows.length > 0) {
      skipped.jobs++;
    } else {
      await upsertJob(job);
      migrated.jobs++;
    }
  } catch (err) {
    console.error(`    FAILED job ${job.id} (${job.title}): ${err.message}`);
  }
}
console.log(`    Done: ${migrated.jobs} migrated, ${skipped.jobs} already existed`);

console.log("  Migrating skills...");
for (const skill of skills) {
  try {
    await upsertSkill(skill);
    migrated.skills++;
  } catch (err) {
    // FK constraint = job doesn't exist, skip
    skipped.skills++;
  }
}
console.log(`    Done: ${migrated.skills} migrated, ${skipped.skills} skipped`);

console.log("  Migrating responsibilities...");
for (const resp of responsibilities) {
  try {
    await upsertResponsibility(resp);
    migrated.responsibilities++;
  } catch (err) {
    skipped.responsibilities++;
  }
}
console.log(`    Done: ${migrated.responsibilities} migrated, ${skipped.responsibilities} skipped`);

console.log("  Migrating corrections...");
for (const corr of corrections) {
  try {
    await upsertCorrection(corr);
    migrated.corrections++;
  } catch (err) {
    skipped.corrections++;
  }
}
console.log(`    Done: ${migrated.corrections} migrated, ${skipped.corrections} skipped`);

// ─── Verify ─────────────────────────────────────────────────────────────────

console.log("\n  Verifying Neon...");
const pgJobCount = await pgClient.query('SELECT COUNT(*) FROM "Job"');
const pgSkillCount = await pgClient.query('SELECT COUNT(*) FROM "JobSkill"');
const pgRespCount = await pgClient.query('SELECT COUNT(*) FROM "JobResponsibility"');
const pgCorrCount = await pgClient.query('SELECT COUNT(*) FROM "Correction"');

console.log(`    Jobs:              ${pgJobCount.rows[0].count}`);
console.log(`    Skills:            ${pgSkillCount.rows[0].count}`);
console.log(`    Responsibilities:  ${pgRespCount.rows[0].count}`);
console.log(`    Corrections:       ${pgCorrCount.rows[0].count}`);

// ─── Cleanup ────────────────────────────────────────────────────────────────

sqlite.close();
await pgClient.end();

console.log("\n  Migration complete! Your data is now in Neon.");
console.log("  Check: https://career-toolkit-gilt.vercel.app/api/health\n");
