import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    // Calculate per-job coverage scores
    const jobScores = jobs.map((job) => {
      const jobSkills = job.skills.map((s) => s.name);

      if (jobSkills.length === 0) {
        return {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          score: 100,
          matchedSkills: [] as string[],
          missedSkills: [] as string[],
        };
      }

      const matchedSkills: string[] = [];
      const missedSkills: string[] = [];

      for (const skill of jobSkills) {
        const skillLower = skill.toLowerCase();
        // Check for the skill in the resume content using various matching strategies
        const matched = isSkillInResume(skillLower, resumeLower);

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
    });

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

/**
 * Check if a skill appears in the resume content using fuzzy matching.
 * Handles multi-word skills, abbreviations, and common variants.
 */
function isSkillInResume(skillLower: string, resumeLower: string): boolean {
  // Direct match
  if (resumeLower.includes(skillLower)) return true;

  // Try individual significant words (for multi-word skills like "machine learning")
  const words = skillLower.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 1) {
    // All significant words present = likely match
    const allPresent = words.every((word) => resumeLower.includes(word));
    if (allPresent) return true;
  }

  // Common abbreviation/variant matching
  const variants = getSkillVariants(skillLower);
  for (const variant of variants) {
    if (resumeLower.includes(variant)) return true;
  }

  return false;
}

/**
 * Get common variants of a skill name for fuzzy matching.
 */
function getSkillVariants(skill: string): string[] {
  const variants: string[] = [];

  // Common tech abbreviation mappings
  const abbreviationMap: Record<string, string[]> = {
    "javascript": ["js", "ecmascript"],
    "typescript": ["ts"],
    "python": ["py"],
    "machine learning": ["ml", "deep learning"],
    "artificial intelligence": ["ai"],
    "kubernetes": ["k8s"],
    "amazon web services": ["aws"],
    "google cloud platform": ["gcp"],
    "microsoft azure": ["azure"],
    "continuous integration": ["ci/cd", "ci"],
    "continuous deployment": ["cd", "ci/cd"],
    "react": ["reactjs", "react.js"],
    "node.js": ["nodejs", "node"],
    "postgresql": ["postgres"],
    "mongodb": ["mongo"],
    "docker": ["containerization", "containers"],
    "agile": ["scrum", "kanban"],
    "project management": ["program management", "project mgmt"],
    "data analysis": ["data analytics", "analytics"],
    "natural language processing": ["nlp"],
    "user experience": ["ux"],
    "user interface": ["ui"],
  };

  // Check if the skill has known variants
  if (abbreviationMap[skill]) {
    variants.push(...abbreviationMap[skill]);
  }

  // Also check if the skill IS an abbreviation
  for (const [full, abbrevs] of Object.entries(abbreviationMap)) {
    if (abbrevs.includes(skill)) {
      variants.push(full);
    }
  }

  return variants;
}
