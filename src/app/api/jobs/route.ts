import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/jobs - List all jobs
export async function GET() {
  const jobs = await prisma.job.findMany({
    include: { skills: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}

// POST /api/jobs - Create a new job and store any corrections
export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    title, company, location, url, description,
    status, source, notes, skills,
    // Original extracted values (sent from the form for correction tracking)
    extracted,
  } = body;

  if (!title || !company || !description) {
    return NextResponse.json(
      { error: "Title, company, and description are required" },
      { status: 400 }
    );
  }

  // Store corrections where extracted value differs from what user saved
  if (extracted) {
    const rawContext = (description || "").slice(0, 500);
    const corrections: { field: string; extractedValue: string; correctedValue: string }[] = [];

    if (extracted.title && extracted.title !== title) {
      corrections.push({ field: "title", extractedValue: extracted.title, correctedValue: title });
    }
    if (extracted.company && extracted.company !== company) {
      corrections.push({ field: "company", extractedValue: extracted.company, correctedValue: company });
    }
    if ((extracted.location || "") !== (location || "")) {
      corrections.push({ field: "location", extractedValue: extracted.location || "", correctedValue: location || "" });
    }

    if (corrections.length > 0) {
      await prisma.correction.createMany({
        data: corrections.map((c) => ({
          ...c,
          rawContext,
          source: source || null,
        })),
      });
    }
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
      skills: skills?.length
        ? {
            create: skills.map((skill: string) => ({ name: skill })),
          }
        : undefined,
    },
    include: { skills: true },
  });

  return NextResponse.json(job, { status: 201 });
}
