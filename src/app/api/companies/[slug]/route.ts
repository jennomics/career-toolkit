import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { slugify } from "@/lib/slugify";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

// GET /api/companies/[slug] - Fetch a single company by slug with jobs and skills breakdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const company = await prisma.company.findUnique({
      where: { slug },
      include: {
        jobs: {
          include: {
            skills: true,
            responsibilities: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!company) {
      return notFoundError("Company not found");
    }

    // Aggregate skills from all jobs for this company
    const skillsMap = new Map<string, { name: string; normalizedName: string | null; category: string | null; count: number }>();
    for (const job of company.jobs) {
      for (const skill of job.skills) {
        const key = skill.normalizedName || skill.name.toLowerCase();
        const existing = skillsMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          skillsMap.set(key, {
            name: skill.name,
            normalizedName: skill.normalizedName,
            category: skill.category,
            count: 1,
          });
        }
      }
    }

    const skillsBreakdown = Array.from(skillsMap.values()).sort(
      (a, b) => b.count - a.count
    );

    return NextResponse.json({
      ...company,
      skillsBreakdown,
    });
  } catch (err) {
    console.error("GET /api/companies/[slug] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PATCH /api/companies/[slug] - Update a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, notes, dreamCompany } = body;

    const company = await prisma.company.findUnique({
      where: { slug },
    });

    if (!company) {
      return notFoundError("Company not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (name !== undefined && name.trim()) {
      const { displayName, normalizedName } = normalizeCompanyName(name);
      updateData.name = displayName;
      updateData.normalizedName = normalizedName;
      updateData.slug = slugify(displayName);
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    if (dreamCompany !== undefined) {
      updateData.dreamCompany = dreamCompany;
    }

    // If slug is being changed, handle potential collisions with retry loop
    if (updateData.slug && updateData.slug !== slug) {
      const baseSlug = updateData.slug;
      const MAX_RETRIES = 10;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const updated = await prisma.company.update({
            where: { slug },
            data: updateData,
          });
          return NextResponse.json(updated);
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            // Slug collision - retry with numeric suffix
            updateData.slug = `${baseSlug}-${attempt + 2}`;
            continue;
          }
          throw err;
        }
      }

      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Could not generate a unique slug", requestId: generateRequestId() } },
        { status: 500 }
      );
    }

    const updated = await prisma.company.update({
      where: { slug },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/companies/[slug] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/companies/[slug] - Delete a company (unlink jobs first)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const company = await prisma.company.findUnique({
      where: { slug },
    });

    if (!company) {
      return notFoundError("Company not found");
    }

    // Unlink all jobs from this company (set companyId to null)
    await prisma.job.updateMany({
      where: { companyId: company.id },
      data: { companyId: null },
    });

    // Delete the company
    await prisma.company.delete({
      where: { slug },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/companies/[slug] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
