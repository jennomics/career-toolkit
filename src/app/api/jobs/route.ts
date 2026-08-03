import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeAndCategorize, normalizeAndCategorizeWithFallback } from "@/lib/skill-taxonomy";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { slugify } from "@/lib/slugify";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

// GET /api/jobs - List all jobs with optional search/filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "";
    const company = searchParams.get("company") || "";
    const source = searchParams.get("source") || "";
    const skill = searchParams.get("skill") || "";

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Company filter
    if (company) {
      where.company = { contains: company, mode: "insensitive" };
    }

    // Source filter
    if (source) {
      where.source = source;
    }

    // Skill filter — jobs that have this skill
    if (skill) {
      where.skills = {
        some: { name: { contains: skill, mode: "insensitive" } },
      };
    }

    // Full-text search across title, company, description, location
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
        { skills: { some: { name: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: { skills: true, responsibilities: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(jobs);
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/jobs - Create a new job and store any corrections
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title, company, location, url, description,
      status, source, notes, skills, responsibilities,
      extracted,
    } = body;

    if (!title || !company || !description) {
      return validationError("Title, company, and description are required");
    }

    // Store corrections where extracted value differs from what user saved
    // Wrapped in try/catch so correction failures don't block saving the job
    if (extracted) {
      try {
        const rawContext = (description || "").slice(0, 500);

        if (extracted.title && extracted.title !== title) {
          await prisma.correction.create({
            data: { field: "title", extractedValue: extracted.title, correctedValue: title, rawContext, source: source || null },
          });
        }
        if (extracted.company && extracted.company !== company) {
          await prisma.correction.create({
            data: { field: "company", extractedValue: extracted.company, correctedValue: company, rawContext, source: source || null },
          });
        }
        if ((extracted.location || "") !== (location || "")) {
          await prisma.correction.create({
            data: { field: "location", extractedValue: extracted.location || "", correctedValue: location || "", rawContext, source: source || null },
          });
        }
      } catch (corrErr) {
        // Log but don't fail the whole request
        console.error("Failed to store corrections:", corrErr);
      }
    }

    // Pre-process skills: normalize and categorize at insert time
    let processedSkills: { name: string; normalizedName: string; category: string | null }[] | undefined;
    if (skills?.length) {
      // First pass: use static taxonomy (synchronous, fast)
      const skillsWithTaxonomy = (skills as string[]).map((s: string) => {
        const { normalizedName, category } = normalizeAndCategorize(s);
        return { name: s, normalizedName, category };
      });

      // Second pass: LLM fallback for skills not in taxonomy (async, batched)
      try {
        const unknownSkills = skillsWithTaxonomy.filter((s) => !s.category);
        if (unknownSkills.length > 0) {
          // Batch into groups of 3 to respect the concurrency semaphore
          const BATCH_SIZE = 3;
          let idx = 0;
          for (let i = 0; i < unknownSkills.length; i += BATCH_SIZE) {
            const batch = unknownSkills.slice(i, i + BATCH_SIZE);
            const llmResults = await Promise.allSettled(
              batch.map((s) => normalizeAndCategorizeWithFallback(s.name))
            );
            for (const result of llmResults) {
              // Find the corresponding skill in the original array
              const skill = skillsWithTaxonomy.find(
                (s) => !s.category && s.name === unknownSkills[idx].name
              );
              if (skill && result.status === "fulfilled" && result.value.category) {
                skill.normalizedName = result.value.normalizedName;
                skill.category = result.value.category;
              }
              idx++;
            }
          }
        }
      } catch {
        // LLM failures never block saving the job
      }

      processedSkills = skillsWithTaxonomy;
    }

    const job = await prisma.job.create({
      data: {
        title,
        company,
        location: location || null,
        url: url || null,
        description,
        status: status || "saved",
        source: source || null,
        notes: notes || null,
        skills: processedSkills?.length
          ? {
              create: processedSkills.map((s) => ({
                name: s.name,
                normalizedName: s.normalizedName,
                category: s.category,
              })),
            }
          : undefined,
        responsibilities: responsibilities?.length
          ? {
              create: responsibilities.map((r: { text: string; category?: string; keywords?: string[] }) => ({
                text: r.text,
                category: r.category || "responsibility",
                keywords: r.keywords || [],
              })),
            }
          : undefined,
      },
      include: { skills: true, responsibilities: true },
    });

    // Auto-create or link to Company record
    try {
      if (company && company.trim()) {
        const { displayName, normalizedName } = normalizeCompanyName(company);

        let companyRecord = await prisma.company.findFirst({
          where: { normalizedName },
        });

        if (!companyRecord) {
          // Attempt to create the company, retrying with numeric suffix on slug collision
          const baseSlug = slugify(displayName);
          let slug = baseSlug;
          const MAX_RETRIES = 10;
          let created = false;

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
              companyRecord = await prisma.company.create({
                data: {
                  name: displayName,
                  normalizedName,
                  slug,
                },
              });
              created = true;
              break;
            } catch (err) {
              if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === "P2002"
              ) {
                // Slug collision - retry with numeric suffix
                slug = `${baseSlug}-${attempt + 2}`;
                continue;
              }
              throw err;
            }
          }

          // If all retries failed, try to find existing company by normalizedName
          if (!created) {
            companyRecord = await prisma.company.findFirst({
              where: { normalizedName },
            });
          }
        }

        if (companyRecord) {
          await prisma.job.update({
            where: { id: job.id },
            data: { companyId: companyRecord.id },
          });

          job.companyId = companyRecord.id;
        }
      }
    } catch (companyErr) {
      // Company linking failures should not block job creation
      console.error("Failed to auto-link company:", companyErr);
    }

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
