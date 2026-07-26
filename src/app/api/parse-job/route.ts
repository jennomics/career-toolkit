import { NextRequest, NextResponse } from "next/server";
import { parseJob } from "@/lib/parse-job";

// POST /api/parse-job - Extract structured data from a raw job description
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text } = body;

  if (!text || text.length < 20) {
    return NextResponse.json(
      { error: "Paste a full job description (at least a few lines)" },
      { status: 400 }
    );
  }

  const parsed = await parseJob(text);
  return NextResponse.json(parsed);
}
