import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// CORS headers for cross-origin requests from localhost
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonWithCors(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, {
    ...init,
    headers: corsHeaders,
  });
}

/**
 * OPTIONS /api/migrate — CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/migrate
 *
 * Accepts your local SQLite data as JSON and writes it to Neon PostgreSQL.
 * This is a one-time migration endpoint. You can disable it after use.
 *
 * Body: { jobs: [...], skills: [...], responsibilities: [...], corrections: [...] }
 */
export async function POST(request: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const data = await request.json();

    const { jobs = [], skills = [], responsibilities = [], corrections = [] } =
      data;

    if (!jobs.length) {
      return jsonWithCors(
        { error: "No jobs provided in request body" },
        { status: 400 }
      );
    }

    const results = {
      jobs: { migrated: 0, skipped: 0, failed: 0 },
      skills: { migrated: 0, skipped: 0, failed: 0 },
      responsibilities: { migrated: 0, skipped: 0, failed: 0 },
      corrections: { migrated: 0, skipped: 0, failed: 0 },
    };

    // Migrate jobs
    for (const job of jobs) {
      try {
        const existing = await prisma.job.findUnique({
          where: { id: job.id },
        });
        if (existing) {
          results.jobs.skipped++;
          continue;
        }
        await prisma.job.create({
          data: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location || null,
            url: job.url || null,
            description: job.description,
            status: job.status || "saved",
            source: job.source || null,
            notes: job.notes || null,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
          },
        });
        results.jobs.migrated++;
      } catch (err) {
        results.jobs.failed++;
        console.error(`[migrate] Job ${job.id} failed:`, err);
      }
    }

    // Migrate skills
    for (const skill of skills) {
      try {
        const existing = await prisma.jobSkill.findUnique({
          where: { id: skill.id },
        });
        if (existing) {
          results.skills.skipped++;
          continue;
        }
        await prisma.jobSkill.create({
          data: {
            id: skill.id,
            name: skill.name,
            jobId: skill.jobId,
          },
        });
        results.skills.migrated++;
      } catch (err) {
        results.skills.failed++;
      }
    }

    // Migrate responsibilities
    for (const resp of responsibilities) {
      try {
        const existing = await prisma.jobResponsibility.findUnique({
          where: { id: resp.id },
        });
        if (existing) {
          results.responsibilities.skipped++;
          continue;
        }
        await prisma.jobResponsibility.create({
          data: {
            id: resp.id,
            text: resp.text,
            category: resp.category,
            jobId: resp.jobId,
          },
        });
        results.responsibilities.migrated++;
      } catch (err) {
        results.responsibilities.failed++;
      }
    }

    // Migrate corrections
    for (const corr of corrections) {
      try {
        const existing = await prisma.correction.findUnique({
          where: { id: corr.id },
        });
        if (existing) {
          results.corrections.skipped++;
          continue;
        }
        await prisma.correction.create({
          data: {
            id: corr.id,
            field: corr.field,
            extractedValue: corr.extractedValue,
            correctedValue: corr.correctedValue,
            rawContext: corr.rawContext,
            source: corr.source || null,
            createdAt: new Date(corr.createdAt),
          },
        });
        results.corrections.migrated++;
      } catch (err) {
        results.corrections.failed++;
      }
    }

    return jsonWithCors({
      status: "complete",
      results,
      totalJobsInDb: await prisma.job.count(),
    });
  } catch (error) {
    console.error("[migrate] Failed:", error);
    return jsonWithCors(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate — shows instructions
 */
export async function GET() {
  return jsonWithCors({
    message:
      "POST your SQLite data here as JSON to migrate to Neon. See /api/migrate/export on your local dev server to get the data.",
  });
}
