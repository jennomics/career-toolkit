import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/jobs - List all jobs
export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      include: { skills: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(jobs);
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job and store any corrections
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title, company, location, url, description,
      status, source, notes, skills,
      extracted,
    } = body;

    if (!title || !company || !description) {
      return NextResponse.json(
        { error: "Title, company, and description are required" },
        { status: 400 }
      );
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
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
