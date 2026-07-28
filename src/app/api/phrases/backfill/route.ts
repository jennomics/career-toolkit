import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for processing many jobs

/**
 * POST /api/phrases/backfill
 *
 * Re-processes existing jobs through the LLM to tag each phrase
 * with the keywords it relates to. Only processes jobs that have
 * phrases without keyword tags.
 *
 * Query params:
 *   ?limit=10  — max jobs to process per call (default 10)
 *   ?force=true — re-process all jobs, even those already tagged
 */
export async function POST(request: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const { llmParseJob } = await import("@/lib/llm-parse-job");

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const force = searchParams.get("force") === "true";

    // Find jobs with untagged phrases
    const jobs = await prisma.job.findMany({
      include: { skills: true, responsibilities: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(force
        ? {}
        : {
            where: {
              responsibilities: {
                some: { keywords: { isEmpty: true } },
              },
            },
          }),
    });

    if (jobs.length === 0) {
      return NextResponse.json({
        status: "complete",
        message: "No jobs need backfilling",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      tagged: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const job of jobs) {
      try {
        // Re-parse with LLM to get phrase→keyword associations
        const parsed = await llmParseJob(job.description);

        // Match parsed phrases to existing responsibilities
        for (const resp of job.responsibilities) {
          // Find the matching parsed phrase (by text similarity)
          const matchedPhrase = parsed.phrases.find(
            (p) =>
              p.text === resp.text ||
              p.text.toLowerCase().includes(resp.text.toLowerCase().slice(0, 40)) ||
              resp.text.toLowerCase().includes(p.text.toLowerCase().slice(0, 40))
          );

          const keywords = matchedPhrase?.keywords || [];

          // If no exact match, assign keywords based on which job-level keywords
          // are mentioned in the phrase text
          if (keywords.length === 0) {
            const allKeywords = parsed.keywords || job.skills.map((s) => s.name);
            for (const kw of allKeywords) {
              if (resp.text.toLowerCase().includes(kw.toLowerCase())) {
                keywords.push(kw);
              }
            }
          }

          // If still no keywords, use the job-level skills most likely related
          // by checking if any extracted phrases have similar text
          if (keywords.length === 0 && parsed.phrases.length > 0) {
            // Assign the most common keywords from the parsed output
            const kwFreq = new Map<string, number>();
            for (const p of parsed.phrases) {
              for (const k of p.keywords) {
                kwFreq.set(k, (kwFreq.get(k) || 0) + 1);
              }
            }
            const topKeywords = Array.from(kwFreq.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([k]) => k);
            keywords.push(...topKeywords);
          }

          if (keywords.length > 0) {
            await prisma.jobResponsibility.update({
              where: { id: resp.id },
              data: { keywords },
            });
            results.tagged++;
          }
        }

        results.processed++;
      } catch (err) {
        results.failed++;
        results.errors.push(
          `Job "${job.title}" (${job.id}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Count remaining untagged
    const remaining = await prisma.jobResponsibility.count({
      where: { keywords: { isEmpty: true } },
    });

    return NextResponse.json({
      status: "complete",
      ...results,
      remainingUntagged: remaining,
      message:
        remaining > 0
          ? `Call again to process more (${remaining} phrases still untagged)`
          : "All phrases are now tagged with keywords!",
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

    const totalPhrases = await prisma.jobResponsibility.count();
    const taggedPhrases = await prisma.jobResponsibility.count({
      where: { keywords: { isEmpty: false } },
    });
    const untaggedPhrases = totalPhrases - taggedPhrases;

    return NextResponse.json({
      totalPhrases,
      taggedPhrases,
      untaggedPhrases,
      percentTagged: totalPhrases > 0 ? Math.round((taggedPhrases / totalPhrases) * 100) : 0,
      message:
        untaggedPhrases > 0
          ? `POST to this endpoint to tag ${untaggedPhrases} phrases with keywords via LLM`
          : "All phrases are tagged!",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
