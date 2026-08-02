import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { slugify } from "@/lib/slugify";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

// GET /api/companies - List all companies with job counts
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    return NextResponse.json(companies);
  } catch (err) {
    console.error("GET /api/companies error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, notes, dreamCompany } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const { displayName, normalizedName } = normalizeCompanyName(name);
    const baseSlug = slugify(displayName);

    // Check for existing company with same normalizedName
    const existing = await prisma.company.findFirst({
      where: { normalizedName },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A company with this name already exists", existing },
        { status: 409 }
      );
    }

    // Attempt to create the company, retrying with numeric suffix on slug collision
    let slug = baseSlug;
    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const company = await prisma.company.create({
          data: {
            name: displayName,
            normalizedName,
            slug,
            notes: notes || null,
            dreamCompany: dreamCompany || false,
          },
        });
        return NextResponse.json(company, { status: 201 });
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

    return NextResponse.json(
      { error: "Could not generate a unique slug" },
      { status: 500 }
    );
  } catch (err) {
    console.error("POST /api/companies error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
