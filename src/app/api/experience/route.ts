import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeAndCategorize, normalizeAndCategorizeWithFallback } from "@/lib/skill-taxonomy";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

/**
 * Check if a Prisma error is a "table does not exist" error.
 * Returns true if the Experience table hasn't been created yet.
 */
function isTableMissingError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes("does not exist in the current database") ||
           err.message.includes("relation") && err.message.includes("does not exist");
  }
  return false;
}

// GET /api/experience - List all experience entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const company = searchParams.get("company") || "";
    const skill = searchParams.get("skill") || "";
    const current = searchParams.get("current"); // "true" to filter current roles only

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (company) {
      where.company = { contains: company, mode: "insensitive" };
    }

    if (current === "true") {
      where.isCurrent = true;
    }

    if (skill) {
      where.skills = {
        some: { name: { contains: skill, mode: "insensitive" } },
      };
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
        { department: { contains: query, mode: "insensitive" } },
        { skills: { some: { name: { contains: query, mode: "insensitive" } } } },
        { highlights: { some: { text: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const experiences = await prisma.experience.findMany({
      where,
      include: { skills: true, highlights: true },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    });

    return NextResponse.json(experiences);
  } catch (err) {
    // If the table doesn't exist yet, return empty array with a setup flag
    if (isTableMissingError(err)) {
      return NextResponse.json([], {
        headers: { "X-Setup-Required": "prisma-db-push" },
      });
    }
    console.error("GET /api/experience error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/experience - Create a new experience entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      company,
      location,
      employmentType,
      industry,
      department,
      startDate,
      endDate,
      isCurrent,
      description,
      skills,
      highlights,
    } = body;

    if (!title || !company || !startDate) {
      return NextResponse.json(
        { error: "Title, company, and start date are required" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date" },
        { status: 400 }
      );
    }

    let end: Date | null = null;
    if (endDate && !isCurrent) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date" },
          { status: 400 }
        );
      }
      if (end < start) {
        return NextResponse.json(
          { error: "End date cannot be before start date" },
          { status: 400 }
        );
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

      // Second pass: LLM fallback for skills not in taxonomy (async, non-blocking)
      try {
        const unknownSkills = skillsWithTaxonomy.filter((s) => !s.category);
        if (unknownSkills.length > 0) {
          const llmResults = await Promise.allSettled(
            unknownSkills.map((s) => normalizeAndCategorizeWithFallback(s.name))
          );
          let idx = 0;
          for (const skill of skillsWithTaxonomy) {
            if (!skill.category) {
              const result = llmResults[idx];
              if (result.status === "fulfilled" && result.value.category) {
                skill.normalizedName = result.value.normalizedName;
                skill.category = result.value.category;
              }
              idx++;
            }
          }
        }
      } catch {
        // LLM failures never block saving the experience
      }

      processedSkills = skillsWithTaxonomy;
    }

    const experience = await prisma.experience.create({
      data: {
        title,
        company,
        location: location || null,
        employmentType: employmentType || "full-time",
        industry: industry || null,
        department: department || null,
        startDate: start,
        endDate: isCurrent ? null : end,
        isCurrent: isCurrent || false,
        description: description || null,
        skills: processedSkills?.length
          ? {
              create: processedSkills.map((s) => ({
                name: s.name,
                normalizedName: s.normalizedName,
                category: s.category,
              })),
            }
          : undefined,
        highlights: highlights?.length
          ? {
              create: highlights.map(
                (h: { text: string; category?: string; metrics?: string; keywords?: string[] }) => ({
                  text: h.text,
                  category: h.category || "achievement",
                  metrics: h.metrics || null,
                  keywords: h.keywords || [],
                })
              ),
            }
          : undefined,
      },
      include: { skills: true, highlights: true },
    });

    return NextResponse.json(experience, { status: 201 });
  } catch (err) {
    // Table doesn't exist — tell user to run prisma db push
    if (isTableMissingError(err)) {
      return NextResponse.json(
        { error: "Database setup required. Run: npx prisma db push" },
        { status: 503 }
      );
    }
    console.error("POST /api/experience error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
