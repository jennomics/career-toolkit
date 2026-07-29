import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";

/**
 * Strip common title prefixes/suffixes for fuzzy matching.
 * e.g. "Senior Software Engineer II" -> "software engineer"
 */
function normalizeTitleForComparison(title: string): string {
  let t = title.trim().toLowerCase();
  // Strip common prefixes
  const prefixes = ["senior ", "sr. ", "sr ", "junior ", "jr. ", "jr ", "lead ", "staff ", "principal "];
  for (const prefix of prefixes) {
    if (t.startsWith(prefix)) {
      t = t.slice(prefix.length);
      break;
    }
  }
  // Strip common suffixes (level numbers)
  const suffixes = [" iv", " iii", " ii", " i"];
  for (const suffix of suffixes) {
    if (t.endsWith(suffix)) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }
  return t.trim();
}

/**
 * POST /api/jobs/check-duplicate
 *
 * Checks if a job with the same title+company already exists,
 * or if the description has high overlap with existing jobs.
 * Uses company name normalization and fuzzy title matching.
 *
 * Body: { title: string, company: string, description: string }
 * Returns: { isDuplicate: boolean, matches: [...] }
 */
export async function POST(request: NextRequest) {
  try {
    const { title, company, description } = await request.json();

    if (!title && !company && !description) {
      return NextResponse.json({ isDuplicate: false, matches: [] });
    }

    const matches: {
      id: string;
      title: string;
      company: string;
      reason: string;
      confidence: "exact" | "likely" | "possible";
      createdAt: string;
    }[] = [];

    // Check 1: Exact title + company match (case-insensitive)
    if (title && company) {
      const titleCompanyMatches = await prisma.job.findMany({
        where: {
          title: { equals: title, mode: "insensitive" },
          company: { equals: company, mode: "insensitive" },
        },
        select: { id: true, title: true, company: true, createdAt: true },
      });

      for (const job of titleCompanyMatches) {
        matches.push({
          id: job.id,
          title: job.title,
          company: job.company,
          reason: "Same title and company",
          confidence: "exact",
          createdAt: job.createdAt.toISOString(),
        });
      }
    }

    // Check 2: Normalized company + fuzzy title match
    if (matches.length === 0 && title && company) {
      const { normalizedName: inputNormCompany } = normalizeCompanyName(company);
      const inputNormTitle = normalizeTitleForComparison(title);

      // First, find the company record by normalized name
      const companyRecord = await prisma.company.findFirst({
        where: { normalizedName: inputNormCompany },
        select: { id: true },
      });

      if (companyRecord) {
        // Only fetch jobs for this specific company instead of all jobs
        const companyJobs = await prisma.job.findMany({
          where: { companyId: companyRecord.id },
          select: { id: true, title: true, company: true, createdAt: true },
        });

        for (const job of companyJobs) {
          const jobNormTitle = normalizeTitleForComparison(job.title);

          if (jobNormTitle === inputNormTitle) {
            if (!matches.some((m) => m.id === job.id)) {
              matches.push({
                id: job.id,
                title: job.title,
                company: job.company,
                reason: "Similar title and company (normalized match)",
                confidence: "likely",
                createdAt: job.createdAt.toISOString(),
              });
            }
          }
        }
      }

      // Also check unlinked jobs with the same company string (normalized)
      if (matches.length === 0) {
        const unlinkedJobs = await prisma.job.findMany({
          where: {
            companyId: null,
            company: { mode: "insensitive", contains: inputNormCompany },
          },
          select: { id: true, title: true, company: true, createdAt: true },
        });

        for (const job of unlinkedJobs) {
          const { normalizedName: jobNormCompany } = normalizeCompanyName(job.company);
          const jobNormTitle = normalizeTitleForComparison(job.title);

          if (jobNormCompany === inputNormCompany && jobNormTitle === inputNormTitle) {
            if (!matches.some((m) => m.id === job.id)) {
              matches.push({
                id: job.id,
                title: job.title,
                company: job.company,
                reason: "Similar title and company (normalized match)",
                confidence: "likely",
                createdAt: job.createdAt.toISOString(),
              });
            }
          }
        }
      }
    }

    // Check 3: If no match found yet, check for similar descriptions
    if (matches.length === 0 && description && description.length > 50) {
      const snippet = description.slice(0, 200).trim();

      const descriptionMatches = await prisma.job.findMany({
        where: {
          description: { contains: snippet, mode: "insensitive" },
        },
        select: { id: true, title: true, company: true, createdAt: true },
        take: 3,
      });

      for (const job of descriptionMatches) {
        matches.push({
          id: job.id,
          title: job.title,
          company: job.company,
          reason: "Very similar description",
          confidence: "possible",
          createdAt: job.createdAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      isDuplicate: matches.length > 0,
      matches,
    });
  } catch (err) {
    // Duplicate check should never block the user - fail silently
    console.error("POST /api/jobs/check-duplicate error:", err);
    return NextResponse.json({ isDuplicate: false, matches: [] });
  }
}
