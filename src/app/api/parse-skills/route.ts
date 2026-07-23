import { NextRequest, NextResponse } from "next/server";
import { parseSkills } from "@/lib/parse-skills";

// POST /api/parse-skills - Extract skills from a job description
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { description } = body;

  if (!description) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }

  const skills = parseSkills(description);
  return NextResponse.json({ skills });
}
