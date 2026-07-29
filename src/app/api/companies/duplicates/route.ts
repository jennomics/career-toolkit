import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/companies/duplicates
 *
 * Finds groups of companies that share the same normalizedName.
 * Returns only groups with 2+ companies (actual duplicates).
 * Suggests which to keep (most jobs, or oldest if tie).
 */
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { jobs: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by normalizedName
    const groups: Record<
      string,
      { id: string; name: string; slug: string; jobCount: number; createdAt: string }[]
    > = {};

    for (const company of companies) {
      const key = company.normalizedName;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({
        id: company.id,
        name: company.name,
        slug: company.slug,
        jobCount: company._count.jobs,
        createdAt: company.createdAt.toISOString(),
      });
    }

    // Filter to only groups with 2+ companies
    const duplicateGroups = Object.entries(groups)
      .filter(([, companies]) => companies.length >= 2)
      .map(([normalizedName, companies]) => {
        // Suggest which to keep: most jobs, or oldest if tie
        const sorted = [...companies].sort((a, b) => {
          if (b.jobCount !== a.jobCount) return b.jobCount - a.jobCount;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        const suggestedKeepId = sorted[0].id;

        return {
          normalizedName,
          companies,
          suggestedKeepId,
        };
      });

    return NextResponse.json(duplicateGroups);
  } catch (err) {
    console.error("GET /api/companies/duplicates error:", err);
    return NextResponse.json(
      { error: "Failed to find duplicate companies" },
      { status: 500 }
    );
  }
}
