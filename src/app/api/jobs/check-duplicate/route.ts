import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/jobs/check-duplicate
 *
 * Checks if a job with the same title+company already exists,
 * or if the description has high overlap with existing jobs.
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

    const matches: { id: string; title: string; company: string; reason: string; createdAt: string }[] = [];

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
          createdAt: job.createdAt.toISOString(),
        });
      }
    }

    // Check 2: If no exact match found, check for similar descriptions
    // Use first 200 chars of description as a fingerprint (avoids full-text comparison overhead)
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
          createdAt: job.createdAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      isDuplicate: matches.length > 0,
      matches,
    });
  } catch (err) {
    // Duplicate check should never block the user — fail silently
    console.error("POST /api/jobs/check-duplicate error:", err);
    return NextResponse.json({ isDuplicate: false, matches: [] });
  }
}
