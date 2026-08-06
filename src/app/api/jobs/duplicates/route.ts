import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { withHandler } from "@/lib/with-handler";

interface JobForDuplication {
  id: string;
  title: string;
  company: string;
  status: string;
  description: string;
  createdAt: Date;
  skills: { id: string }[];
  responsibilities: { id: string }[];
}

interface DuplicateJobInfo {
  id: string;
  title: string;
  company: string;
  status: string;
  skillCount: number;
  responsibilityCount: number;
  descriptionLength: number;
  richness: number;
  createdAt: string;
}

/**
 * GET /api/jobs/duplicates
 *
 * Finds potential duplicate jobs by:
 * a) Same normalized company name + same title (case-insensitive)
 * b) Very similar descriptions (first 200 chars match, case-insensitive)
 *
 * Returns groups with a richness score to suggest which to keep.
 */
export const GET = withHandler(async (_request: NextRequest) => {
  const jobs = await prisma.job.findMany({
    include: {
      skills: { select: { id: true } },
      responsibilities: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const duplicateGroups: {
    reason: string;
    jobs: DuplicateJobInfo[];
  }[] = [];

  const seenJobIds = new Set<string>();

  // Helper to convert job to output format
  function toJobInfo(job: JobForDuplication): DuplicateJobInfo {
    const skillCount = job.skills.length;
    const responsibilityCount = job.responsibilities.length;
    const descriptionLength = job.description.length;
    const richness = skillCount + responsibilityCount + descriptionLength / 100;
    return {
      id: job.id,
      title: job.title,
      company: job.company,
      status: job.status,
      skillCount,
      responsibilityCount,
      descriptionLength,
      richness: Math.round(richness * 100) / 100,
      createdAt: job.createdAt.toISOString(),
    };
  }

  // Check a) Same normalized company + same title (case-insensitive)
  const titleCompanyGroups: Record<string, JobForDuplication[]> = {};
  for (const job of jobs) {
    const { normalizedName } = normalizeCompanyName(job.company);
    const key = `${job.title.toLowerCase()}|||${normalizedName}`;
    if (!titleCompanyGroups[key]) {
      titleCompanyGroups[key] = [];
    }
    titleCompanyGroups[key].push(job);
  }

  for (const [, group] of Object.entries(titleCompanyGroups)) {
    if (group.length >= 2) {
      const jobInfos = group.map(toJobInfo);
      for (const j of group) seenJobIds.add(j.id);
      duplicateGroups.push({
        reason: `Same title and company: "${group[0].title}" at "${group[0].company}"`,
        jobs: jobInfos,
      });
    }
  }

  // Check b) Very similar descriptions (first 200 chars match, case-insensitive)
  const descGroups: Record<string, JobForDuplication[]> = {};
  for (const job of jobs) {
    if (seenJobIds.has(job.id)) continue;
    if (job.description.length < 50) continue;
    const snippet = job.description.slice(0, 200).toLowerCase().trim();
    if (!descGroups[snippet]) {
      descGroups[snippet] = [];
    }
    descGroups[snippet].push(job);
  }

  for (const [, group] of Object.entries(descGroups)) {
    if (group.length >= 2) {
      const jobInfos = group.map(toJobInfo);
      duplicateGroups.push({
        reason: `Very similar description (first 200 chars match)`,
        jobs: jobInfos,
      });
    }
  }

  return NextResponse.json(duplicateGroups);
});
