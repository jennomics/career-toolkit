import { NextRequest, NextResponse } from "next/server";
import { parseSkills } from "@/lib/parse-skills";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

// POST /api/parse-skills - Extract skills from a job description
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Description is required", requestId } },
        { status: 400 }
      );
    }

    const skills = parseSkills(description);
    return NextResponse.json({ skills });
  } catch (err) {
    console.error("POST /api/parse-skills error:", err);
    return formatErrorResponse(err, requestId);
  }
}
