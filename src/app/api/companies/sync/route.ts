import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { slugify } from "@/lib/slugify";

// POST /api/companies/sync - Generate companies from existing job data
export async function POST() {
  try {
    // Find all jobs with no company link
    const unlinkedJobs = await prisma.job.findMany({
      where: { companyId: null },
      select: { id: true, company: true },
    });

    if (unlinkedJobs.length === 0) {
      return NextResponse.json({ created: 0, linked: 0, errors: 0 });
    }

    // Group jobs by normalized company name
    const groups = new Map<string, { displayName: string; normalizedName: string; jobIds: string[] }>();

    for (const job of unlinkedJobs) {
      if (!job.company || !job.company.trim()) continue;

      const { displayName, normalizedName } = normalizeCompanyName(job.company);
      const existing = groups.get(normalizedName);
      if (existing) {
        existing.jobIds.push(job.id);
      } else {
        groups.set(normalizedName, {
          displayName,
          normalizedName,
          jobIds: [job.id],
        });
      }
    }

    let created = 0;
    let linked = 0;
    let errors = 0;

    // Process each group: find or create company, then link jobs
    const entries = Array.from(groups.values());
    const BATCH_SIZE = 5;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (group) => {
          // Find existing company by normalizedName
          let company = await prisma.company.findFirst({
            where: { normalizedName: group.normalizedName },
          });

          let wasCreated = false;
          if (!company) {
            // Create new company
            company = await prisma.company.create({
              data: {
                name: group.displayName,
                normalizedName: group.normalizedName,
                slug: slugify(group.displayName),
              },
            });
            wasCreated = true;
          }

          // Link all jobs in this group to the company
          const linkResults = await Promise.allSettled(
            group.jobIds.map((jobId) =>
              prisma.job.update({
                where: { id: jobId },
                data: { companyId: company.id },
              })
            )
          );

          const linkedCount = linkResults.filter(
            (r) => r.status === "fulfilled"
          ).length;
          const errorCount = linkResults.filter(
            (r) => r.status === "rejected"
          ).length;

          return { wasCreated, linkedCount, errorCount };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.wasCreated) created++;
          linked += result.value.linkedCount;
          errors += result.value.errorCount;
        } else {
          errors++;
        }
      }
    }

    return NextResponse.json({ created, linked, errors });
  } catch (err) {
    console.error("POST /api/companies/sync error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
