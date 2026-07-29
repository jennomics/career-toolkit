import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeSkillName, getAliases } from "@/lib/skill-taxonomy";

export const dynamic = "force-dynamic";

// Alias lookup is now O(1) via getAliases from the taxonomy module.

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a skill appears in the resume content using word-boundary regex matching.
 * Uses the taxonomy's normalizeSkillName to resolve variants instead of a local abbreviation map.
 */
function isSkillInResume(skillRaw: string, resumeLower: string): boolean {
  const skillLower = skillRaw.toLowerCase().trim();

  // Use word-boundary regex for precise matching (avoids "go" matching "google")
  const escaped = escapeRegex(skillLower);
  const regex = new RegExp(`\\b${escaped}\\b`);
  if (regex.test(resumeLower)) return true;

  // Normalize the skill using the taxonomy and check the canonical form
  const canonicalName = normalizeSkillName(skillRaw);
  if (canonicalName !== skillRaw) {
    const canonicalLower = canonicalName.toLowerCase();
    const canonicalEscaped = escapeRegex(canonicalLower);
    const canonicalRegex = new RegExp(`\\b${canonicalEscaped}\\b`);
    if (canonicalRegex.test(resumeLower)) return true;
  }

  // Check if any known alias of the skill's canonical form appears in the resume
  const aliases = getAliases(canonicalName);
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();
    const aliasEscaped = escapeRegex(aliasLower);
    const aliasRegex = new RegExp(`\\b${aliasEscaped}\\b`);
    if (aliasRegex.test(resumeLower)) return true;
  }

  // For multi-word skills, check if all significant words appear
  const words = skillLower.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 1) {
    if (words.length === 2) {
      // For 2-word skills, require both words to appear within a 100-char sliding window
      // to avoid false positives from scattered occurrences (e.g., "data engineering" matching
      // "data governance" in one paragraph and "software engineering" in another).
      const [word1, word2] = words;
      const word1Escaped = escapeRegex(word1);
      const word1Regex = new RegExp(`\\b${word1Escaped}\\b`, "g");
      let match: RegExpExecArray | null;
      while ((match = word1Regex.exec(resumeLower)) !== null) {
        // Check if word2 appears within 100 chars of this occurrence of word1
        const windowStart = Math.max(0, match.index - 100);
        const windowEnd = Math.min(resumeLower.length, match.index + match[0].length + 100);
        const window = resumeLower.slice(windowStart, windowEnd);
        const word2Escaped = escapeRegex(word2);
        const word2Regex = new RegExp(`\\b${word2Escaped}\\b`);
        if (word2Regex.test(window)) return true;
      }
    } else {
      // For 3+ word skills, check if all words appear anywhere (existing behavior)
      const allPresent = words.every((word) => {
        const wordEscaped = escapeRegex(word);
        const wordRegex = new RegExp(`\\b${wordEscaped}\\b`);
        return wordRegex.test(resumeLower);
      });
      if (allPresent) return true;
    }
  }

  return false;
}

/**
 * POST /api/resume/coverage
 *
 * Evaluates what percentage of saved jobs' key requirements a resume satisfies.
 * Body: { resumeContent: string }
 *
 * Returns: {
 *   overallScore: number (0-100),
 *   jobScores: [{ jobId, jobTitle, company, score, matchedSkills[], missedSkills[] }],
 *   topGaps: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeContent } = body;

    if (!resumeContent || typeof resumeContent !== "string") {
      return NextResponse.json(
        { error: "resumeContent (string) is required" },
        { status: 400 }
      );
    }

    // Fetch all saved jobs with their skills
    const jobs = await prisma.job.findMany({
      include: { skills: true },
      orderBy: { createdAt: "desc" },
    });

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "No saved jobs to evaluate against. Add some job descriptions first." },
        { status: 400 }
      );
    }

    // Normalize the resume content for matching
    const resumeLower = resumeContent.toLowerCase();

    // Track all missed skills across jobs for topGaps
    const gapFrequency = new Map<string, number>();

    // Calculate per-job coverage scores (exclude jobs with no skills)
    const jobScores = jobs
      .map((job) => {
        const jobSkills = job.skills.map((s) => s.name);

        // Exclude jobs with no skills from scoring - they cannot be meaningfully evaluated
        if (jobSkills.length === 0) {
          return null;
        }

        const matchedSkills: string[] = [];
        const missedSkills: string[] = [];

        for (const skill of jobSkills) {
          const matched = isSkillInResume(skill, resumeLower);

          if (matched) {
            matchedSkills.push(skill);
          } else {
            missedSkills.push(skill);
            gapFrequency.set(skill, (gapFrequency.get(skill) || 0) + 1);
          }
        }

        const score = Math.round((matchedSkills.length / jobSkills.length) * 100);

        return {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          score,
          matchedSkills,
          missedSkills,
        };
      })
      .filter((score): score is NonNullable<typeof score> => score !== null);

    // Calculate overall score (weighted average, jobs with more skills matter more)
    const totalSkillChecks = jobScores.reduce(
      (sum, j) => sum + j.matchedSkills.length + j.missedSkills.length,
      0
    );
    const totalMatched = jobScores.reduce(
      (sum, j) => sum + j.matchedSkills.length,
      0
    );
    const overallScore = totalSkillChecks > 0
      ? Math.round((totalMatched / totalSkillChecks) * 100)
      : 0;

    // Top gaps: skills most frequently missed across all jobs
    const topGaps = Array.from(gapFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    return NextResponse.json({
      overallScore,
      jobScores,
      topGaps,
    });
  } catch (err) {
    console.error("POST /api/resume/coverage error:", err);
    return NextResponse.json(
      { error: "Failed to calculate coverage", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
