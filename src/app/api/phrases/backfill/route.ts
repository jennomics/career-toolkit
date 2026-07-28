import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for processing many jobs

/**
 * POST /api/phrases/backfill
 *
 * Re-processes existing jobs through the LLM to extract skills,
 * responsibilities/phrases, and keyword associations.
 *
 * Handles TWO cases:
 * 1. Jobs with NO responsibilities at all (need full extraction)
 * 2. Jobs with responsibilities but no keyword tags (need tagging only)
 *
 * Query params:
 *   ?limit=5   — max jobs to process per call (default 5, LLM is slow)
 */
export async function POST(request: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const { llmParseJob } = await import("@/lib/llm-parse-job");

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    // Find jobs that need processing: no responsibilities OR no skills
    const jobs = await prisma.job.findMany({
      include: { skills: true, responsibilities: true },
      where: {
        OR: [
          { responsibilities: { none: {} } },
          { skills: { none: {} } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (jobs.length === 0) {
      return NextResponse.json({
        status: "complete",
        message: "All jobs have been parsed! No more to process.",
        processed: 0,
        totalJobsRemaining: 0,
      });
    }

    const results = {
      processed: 0,
      skillsAdded: 0,
      phrasesAdded: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const job of jobs) {
      try {
        // Parse the job description through LLM
        const parsed = await llmParseJob(job.description);

        // Add skills if missing
        if (job.skills.length === 0 && parsed.keywords.length > 0) {
          for (const keyword of parsed.keywords) {
            await prisma.jobSkill.create({
              data: {
                name: keyword,
                jobId: job.id,
              },
            });
            results.skillsAdded++;
          }
        }

        // Add responsibilities/phrases if missing
        if (job.responsibilities.length === 0 && parsed.phrases.length > 0) {
          for (const phrase of parsed.phrases) {
            await prisma.jobResponsibility.create({
              data: {
                text: phrase.text,
                category: phrase.category,
                keywords: phrase.keywords || [],
                jobId: job.id,
              },
            });
            results.phrasesAdded++;
          }
        }

        results.processed++;
      } catch (err) {
        results.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        results.errors.push(`"${job.title}" at ${job.company}: ${msg}`);
      }
    }

    // Count remaining
    const remaining = await prisma.job.count({
      where: {
        OR: [
          { responsibilities: { none: {} } },
          { skills: { none: {} } },
        ],
      },
    });

    return NextResponse.json({
      status: "complete",
      ...results,
      totalJobsRemaining: remaining,
      message:
        remaining > 0
          ? `Processed ${results.processed} jobs. ${remaining} remaining — click again.`
          : `Done! All jobs have skills and phrases extracted.`,
    });
  } catch (error) {
    console.error("[phrases/backfill] Failed:", error);
    return NextResponse.json(
      {
        error: "Backfill failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/phrases/backfill — shows status
 */
export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");

    const totalJobs = await prisma.job.count();
    const jobsWithPhrases = await prisma.job.count({
      where: { responsibilities: { some: {} } },
    });
    const jobsWithSkills = await prisma.job.count({
      where: { skills: { some: {} } },
    });
    const jobsNeedingParsing = await prisma.job.count({
      where: {
        OR: [
          { responsibilities: { none: {} } },
          { skills: { none: {} } },
        ],
      },
    });

    return NextResponse.json({
      totalJobs,
      jobsWithPhrases,
      jobsWithSkills,
      jobsNeedingParsing,
      message:
        jobsNeedingParsing > 0
          ? `${jobsNeedingParsing} jobs need parsing. POST to this endpoint to process them via GPT-4o-mini.`
          : "All jobs have been parsed!",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
