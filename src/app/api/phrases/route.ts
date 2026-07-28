import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/phrases
 *
 * Returns all resume-ready phrases grouped by keyword, sorted by frequency.
 * Each keyword shows how many jobs mention it and all associated phrases.
 */
export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");

    // Get all jobs with skills and responsibilities
    const jobs = await prisma.job.findMany({
      include: {
        skills: true,
        responsibilities: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Build keyword → phrases mapping
    const keywordMap = new Map<
      string,
      {
        count: number;
        phrases: {
          text: string;
          category: string;
          jobTitle: string;
          company: string;
          jobId: string;
        }[];
      }
    >();

    for (const job of jobs) {
      for (const skill of job.skills) {
        const keyword = skill.name;
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, { count: 0, phrases: [] });
        }
        const entry = keywordMap.get(keyword)!;
        entry.count++;

        // Associate phrases from this job with this keyword
        // Prioritize phrases that mention the keyword directly
        const keywordLower = keyword.toLowerCase();
        for (const resp of job.responsibilities) {
          const alreadyAdded = entry.phrases.some(
            (p) => p.text === resp.text && p.jobId === job.id
          );
          if (!alreadyAdded) {
            // Check if phrase relates to this keyword (contains it, or is from same job)
            const isDirectMatch = resp.text
              .toLowerCase()
              .includes(keywordLower);
            if (isDirectMatch) {
              entry.phrases.push({
                text: resp.text,
                category: resp.category,
                jobTitle: job.title,
                company: job.company,
                jobId: job.id,
              });
            }
          }
        }
      }
    }

    // For keywords with no direct phrase matches, include all phrases from jobs with that keyword
    for (const [keyword, entry] of keywordMap) {
      if (entry.phrases.length === 0) {
        for (const job of jobs) {
          const hasKeyword = job.skills.some((s) => s.name === keyword);
          if (hasKeyword) {
            for (const resp of job.responsibilities) {
              const alreadyAdded = entry.phrases.some(
                (p) => p.text === resp.text && p.jobId === job.id
              );
              if (!alreadyAdded) {
                entry.phrases.push({
                  text: resp.text,
                  category: resp.category,
                  jobTitle: job.title,
                  company: job.company,
                  jobId: job.id,
                });
              }
            }
          }
        }
      }
    }

    // Convert to sorted array (by job count descending)
    const keywords = Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keyword,
        jobCount: data.count,
        phraseCount: data.phrases.length,
        phrases: data.phrases,
      }))
      .sort((a, b) => b.jobCount - a.jobCount);

    // Summary stats
    const totalPhrases = jobs.reduce(
      (sum, j) => sum + j.responsibilities.length,
      0
    );
    const totalKeywords = keywords.length;
    const totalJobs = jobs.length;

    return NextResponse.json({
      summary: { totalJobs, totalKeywords, totalPhrases },
      keywords,
    });
  } catch (error) {
    console.error("[phrases] Failed:", error);
    return NextResponse.json(
      {
        error: "Failed to load phrases",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
