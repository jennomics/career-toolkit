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

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { title, company, location, url, description, status, source, notes, skills } = body;

  if (!title || !company || !description) {
    return NextResponse.json(
      { error: "Title, company, and description are required" },
      { status: 400 }
    );
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
