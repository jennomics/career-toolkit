import { NextResponse } from "next/server";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/phrases
 *
 * Returns all resume-ready phrases grouped by keyword, sorted by frequency.
 * Uses the LLM-assigned keywords on each phrase for accurate grouping.
 * Falls back to job-level skill association for phrases without keyword tags.
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
          id: string;
          text: string;
          category: string;
          keywords: string[];
          jobTitle: string;
          company: string;
          jobId: string;
        }[];
      }
    >();

    for (const job of jobs) {
      // Track which keywords this job has
      for (const skill of job.skills) {
        const keyword = skill.name;
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, { count: 0, phrases: [] });
        }
        keywordMap.get(keyword)!.count++;
      }

      // Associate phrases with keywords
      for (const resp of job.responsibilities) {
        const phraseKeywords = (resp.keywords as string[]) || [];

        if (phraseKeywords.length > 0) {
          // Phrase has LLM-assigned keywords — use them
          for (const kw of phraseKeywords) {
            if (!keywordMap.has(kw)) {
              keywordMap.set(kw, { count: 0, phrases: [] });
            }
            const entry = keywordMap.get(kw)!;
            const alreadyAdded = entry.phrases.some(
              (p) => p.text === resp.text && p.jobId === job.id
            );
            if (!alreadyAdded) {
              entry.phrases.push({
                id: resp.id,
                text: resp.text,
                category: resp.category,
                keywords: phraseKeywords,
                jobTitle: job.title,
                company: job.company,
                jobId: job.id,
              });
            }
          }
        } else {
          // No per-phrase keywords — fall back to all job-level skills
          for (const skill of job.skills) {
            const entry = keywordMap.get(skill.name);
            if (entry) {
              const alreadyAdded = entry.phrases.some(
                (p) => p.text === resp.text && p.jobId === job.id
              );
              if (!alreadyAdded) {
                entry.phrases.push({
                  id: resp.id,
                  text: resp.text,
                  category: resp.category,
                  keywords: job.skills.map((s) => s.name),
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
      .filter((kw) => kw.phraseCount > 0)
      .sort((a, b) => b.jobCount - a.jobCount || b.phraseCount - a.phraseCount);

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
    const requestId = generateRequestId();
    return formatErrorResponse(error, requestId);
  }
}
