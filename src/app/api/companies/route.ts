import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { slugify } from "@/lib/slugify";
import { generateRequestId, validationError } from "@/lib/api-error";
import { withHandler } from "@/lib/with-handler";

// GET /api/companies - List all companies with job counts
export const GET = withHandler(async (_request: NextRequest) => {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { jobs: true },
      },
    },
  });

  return NextResponse.json(companies);
});

// POST /api/companies - Create a new company
export const POST = withHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { name, notes, dreamCompany } = body;

  if (!name || !name.trim()) {
    return validationError("Company name is required");
  }

  const { displayName, normalizedName } = normalizeCompanyName(name);
  const baseSlug = slugify(displayName);

  // Check for existing company with same normalizedName
  const existing = await prisma.company.findFirst({
    where: { normalizedName },
  });

  if (existing) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "A company with this name already exists", requestId: generateRequestId() }, existing },
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
    { error: { code: "INTERNAL_ERROR", message: "Could not generate a unique slug", requestId: generateRequestId() } },
    { status: 500 }
  );
});
