import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeCompanyName } from "@/lib/normalize-company";
import { slugify } from "@/lib/slugify";

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
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
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
    const slug = slugify(displayName);

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
    console.error("POST /api/companies error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
