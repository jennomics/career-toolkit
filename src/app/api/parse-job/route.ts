import { NextRequest, NextResponse } from "next/server";
import { llmParseJob } from "@/lib/llm-parse-job";
import { parseJob } from "@/lib/parse-job";
import { parseResponsibilities } from "@/lib/parse-responsibilities";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

// POST /api/parse-job - Extract structured data from a raw job description
// Uses LLM (GPT-4o-mini) when available, falls back to regex parsing
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Paste a full job description (at least a few lines)", requestId } },
        { status: 400 }
      );
    }

    // Try LLM first
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log("Using LLM for parsing...");
        const parsed = await llmParseJob(text);
        return NextResponse.json({
          title: parsed.title,
          company: parsed.company,
          location: parsed.location,
          skills: parsed.keywords,
          responsibilities: parsed.phrases,
          source: "llm",
        });
      } catch (err) {
        console.error("LLM parsing failed, falling back to regex:", err);
        // Fall through to regex parser
      }
    } else {
      console.log("No OPENAI_API_KEY found, using regex parser");
    }

    // Fallback: regex-based parsing
    const parsed = await parseJob(text);
    const responsibilities = parseResponsibilities(text);
    return NextResponse.json({
      title: parsed.title,
      company: parsed.company,
      location: parsed.location,
      skills: parsed.skills,
      responsibilities: responsibilities,
      source: "regex",
    });
  } catch (err) {
    console.error("POST /api/parse-job error:", err);
    return formatErrorResponse(err, requestId);
  }
}
