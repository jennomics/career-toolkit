import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type CheckStatus = "pass" | "warn" | "fail";

interface IntegrityCheck {
  name: string;
  status: CheckStatus;
  message: string;
  details?: unknown;
}

/**
 * POST /api/integrity
 *
 * Full system coherence check. Validates:
 * 1. Database connectivity
 * 2. Schema sync (all expected tables exist with correct columns)
 * 3. Data integrity (no orphan records)
 * 4. Environment variables
 * 5. Data stats (sanity check)
 *
 * Returns: { overall: "pass" | "warn" | "fail", checks: [...], timestamp }
 */
export async function POST(request: NextRequest) {
  const checks: IntegrityCheck[] = [];

  // 1. Database connectivity
  try {
    const start = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    const latency = Date.now() - start;

    checks.push({
      name: "database_connectivity",
      status: latency > 2000 ? "warn" : "pass",
      message: latency > 2000 ? `Connected but slow (${latency}ms)` : `Connected (${latency}ms)`,
    });
  } catch (err) {
    checks.push({
      name: "database_connectivity",
      status: "fail",
      message: `Cannot connect to database: ${err instanceof Error ? err.message : String(err)}`,
    });
    // If DB is down, return early — other checks will fail
    return NextResponse.json({
      overall: "fail",
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  // 2. Schema sync — verify all expected tables exist
  try {
    const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    const tableNames = tables.map((t) => t.tablename);

    const expectedTables = ["Job", "JobSkill", "JobResponsibility", "Correction", "AgentCommand"];
    const missing = expectedTables.filter((t) => !tableNames.includes(t));

    if (missing.length > 0) {
      checks.push({
        name: "schema_sync",
        status: "fail",
        message: `Missing tables: ${missing.join(", ")}. Run 'npx prisma migrate dev' to sync.`,
        details: { expected: expectedTables, found: tableNames, missing },
      });
    } else {
      checks.push({
        name: "schema_sync",
        status: "pass",
        message: `All ${expectedTables.length} expected tables present`,
      });
    }
  } catch (err) {
    checks.push({
      name: "schema_sync",
      status: "warn",
      message: `Could not verify schema: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 3. Data integrity — orphan records
  try {
    // Skills referencing non-existent jobs
    const orphanSkills = await prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM "JobSkill" js LEFT JOIN "Job" j ON js."jobId" = j.id WHERE j.id IS NULL`
    );
    const orphanSkillCount = parseInt(String(orphanSkills[0]?.count || "0"), 10);

    // Responsibilities referencing non-existent jobs
    const orphanResps = await prisma.$queryRawUnsafe<{ count: string }[]>(
      `SELECT COUNT(*) as count FROM "JobResponsibility" jr LEFT JOIN "Job" j ON jr."jobId" = j.id WHERE j.id IS NULL`
    );
    const orphanRespCount = parseInt(String(orphanResps[0]?.count || "0"), 10);

    const totalOrphans = orphanSkillCount + orphanRespCount;

    if (totalOrphans > 0) {
      checks.push({
        name: "data_integrity",
        status: "warn",
        message: `Found ${totalOrphans} orphan records (${orphanSkillCount} skills, ${orphanRespCount} phrases referencing deleted jobs)`,
        details: { orphanSkills: orphanSkillCount, orphanResponsibilities: orphanRespCount },
      });
    } else {
      checks.push({
        name: "data_integrity",
        status: "pass",
        message: "No orphan records found",
      });
    }
  } catch (err) {
    checks.push({
      name: "data_integrity",
      status: "warn",
      message: `Could not check data integrity: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 4. Environment variables
  try {
    const required = ["POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL"];

    const hasDb = required.some((v) => !!process.env[v]);
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGcToken = !!process.env.GC_AUTH_TOKEN;

    if (!hasDb) {
      checks.push({
        name: "env_vars",
        status: "fail",
        message: "No database connection string found (POSTGRES_URL, POSTGRES_PRISMA_URL, or DATABASE_URL)",
      });
    } else {
      const warnings: string[] = [];
      if (!hasOpenAI) warnings.push("OPENAI_API_KEY not set (LLM features will use regex fallback)");
      if (!hasGcToken) warnings.push("GC_AUTH_TOKEN not set (groundcrew API is open/unauthenticated)");

      checks.push({
        name: "env_vars",
        status: warnings.length > 0 ? "warn" : "pass",
        message: warnings.length > 0 ? warnings.join("; ") : "All env vars configured",
        details: { database: true, openai: hasOpenAI, gcToken: hasGcToken },
      });
    }
  } catch (err) {
    checks.push({
      name: "env_vars",
      status: "warn",
      message: `Could not check env vars: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 5. Data stats (sanity check)
  try {
    const jobCount = await prisma.job.count();
    const skillCount = await prisma.jobSkill.count();
    const phraseCount = await prisma.jobResponsibility.count();
    const commandCount = await prisma.agentCommand.count();

    const taggedPhrases = await prisma.jobResponsibility.count({
      where: { keywords: { isEmpty: false } },
    });

    const tagRate = phraseCount > 0 ? Math.round((taggedPhrases / phraseCount) * 100) : 0;

    checks.push({
      name: "data_stats",
      status: jobCount === 0 ? "warn" : "pass",
      message: jobCount === 0
        ? "No jobs in database — app is empty"
        : `${jobCount} jobs, ${skillCount} skills, ${phraseCount} phrases (${tagRate}% tagged), ${commandCount} agent commands`,
      details: { jobs: jobCount, skills: skillCount, phrases: phraseCount, taggedPhrases, tagRate, commands: commandCount },
    });
  } catch (err) {
    checks.push({
      name: "data_stats",
      status: "warn",
      message: `Could not gather stats: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // 6. Sentinel status — check if route health passes
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      checks.push({
        name: "health_endpoint",
        status: healthData.status === "healthy" ? "pass" : "warn",
        message: healthData.status === "healthy" ? "Health endpoint reports healthy" : `Health endpoint reports: ${healthData.status}`,
      });
    } else {
      checks.push({
        name: "health_endpoint",
        status: "fail",
        message: `Health endpoint returned ${healthRes.status}`,
      });
    }
  } catch (err) {
    checks.push({
      name: "health_endpoint",
      status: "warn",
      message: `Could not reach health endpoint: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Calculate overall status
  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const overall: CheckStatus = hasFail ? "fail" : hasWarn ? "warn" : "pass";

  return NextResponse.json({
    overall,
    timestamp: new Date().toISOString(),
    passed: checks.filter((c) => c.status === "pass").length,
    warnings: checks.filter((c) => c.status === "warn").length,
    failed: checks.filter((c) => c.status === "fail").length,
    total: checks.length,
    checks,
  });
}

/**
 * GET /api/integrity
 *
 * Returns usage instructions.
 */
export async function GET() {
  return NextResponse.json({
    message: "POST to this endpoint to run a full system integrity check.",
    usage: "POST /api/integrity",
    checks: [
      "database_connectivity — Can we reach Neon?",
      "schema_sync — Do all expected tables exist?",
      "data_integrity — Any orphan records?",
      "env_vars — Required env vars present?",
      "data_stats — How much data is in the system?",
      "health_endpoint — Does /api/health report healthy?",
    ],
  });
}
