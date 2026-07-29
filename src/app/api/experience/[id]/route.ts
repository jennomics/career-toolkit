import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeAndCategorize, normalizeAndCategorizeWithFallback } from "@/lib/skill-taxonomy";

/**
 * Check if a Prisma error is a "table does not exist" error.
 */
function isTableMissingError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes("does not exist in the current database") ||
           err.message.includes("relation") && err.message.includes("does not exist");
  }
  return false;
}

const TABLE_MISSING_MSG = "Database setup required. Run: npx prisma db push";

// GET /api/experience/[id] - Get a single experience entry
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const experience = await prisma.experience.findUnique({
      where: { id },
      include: { skills: true, highlights: true },
    });

    if (!experience) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    return NextResponse.json(experience);
  } catch (err) {
    if (isTableMissingError(err)) {
      return NextResponse.json({ error: TABLE_MISSING_MSG }, { status: 503 });
    }
    console.error("GET /api/experience/[id] error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch experience";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/experience/[id] - Update an experience entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify the experience exists
    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    // Validate dates if provided
    let start: Date | undefined;
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
      }
    }

    let end: Date | null | undefined;
    if (isCurrent) {
      end = null;
    } else if (endDate !== undefined) {
      if (endDate === null) {
        end = null;
      } else {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
        }
        const effectiveStart = start || existing.startDate;
        if (end < effectiveStart) {
          return NextResponse.json(
            { error: "End date cannot be before start date" },
            { status: 400 }
          );
        }
      }
    }

    // Build the update data (only include provided fields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (company !== undefined) updateData.company = company;
    if (location !== undefined) updateData.location = location || null;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (industry !== undefined) updateData.industry = industry || null;
    if (department !== undefined) updateData.department = department || null;
    if (start !== undefined) updateData.startDate = start;
    if (end !== undefined) updateData.endDate = end;
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent;
    if (description !== undefined) updateData.description = description || null;

    // Handle skills: delete existing and recreate if provided
    if (skills !== undefined) {
      await prisma.experienceSkill.deleteMany({ where: { experienceId: id } });
      if (skills.length > 0) {
        // Pre-process skills: normalize and categorize at insert time
        const skillsWithTaxonomy = (skills as string[]).map((s: string) => {
          const { normalizedName, category } = normalizeAndCategorize(s);
          return { name: s, normalizedName, category };
        });

        // LLM fallback for skills not in taxonomy (async, non-blocking)
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

        updateData.skills = {
          create: skillsWithTaxonomy.map((s) => ({
            name: s.name,
            normalizedName: s.normalizedName,
            category: s.category,
          })),
        };
      }
    }

    // Handle highlights: delete existing and recreate if provided
    if (highlights !== undefined) {
      await prisma.experienceHighlight.deleteMany({ where: { experienceId: id } });
      if (highlights.length > 0) {
        updateData.highlights = {
          create: highlights.map(
            (h: { text: string; category?: string; metrics?: string; keywords?: string[] }) => ({
              text: h.text,
              category: h.category || "achievement",
              metrics: h.metrics || null,
              keywords: h.keywords || [],
            })
          ),
        };
      }
    }

    const experience = await prisma.experience.update({
      where: { id },
      data: updateData,
      include: { skills: true, highlights: true },
    });

    return NextResponse.json(experience);
  } catch (err) {
    if (isTableMissingError(err)) {
      return NextResponse.json({ error: TABLE_MISSING_MSG }, { status: 503 });
    }
    console.error("PATCH /api/experience/[id] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/experience/[id] - Delete an experience entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify it exists
    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    await prisma.experience.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isTableMissingError(err)) {
      return NextResponse.json({ error: TABLE_MISSING_MSG }, { status: 503 });
    }
    console.error("DELETE /api/experience/[id] error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete experience";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
