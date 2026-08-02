import { NextRequest, NextResponse } from "next/server";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a resume parser. Given the raw text from a resume, extract ALL work experience entries into structured data.

For each role/position found, extract:
- title: Job title
- company: Company name
- location: Location (city, state, or "Remote") — null if not mentioned
- employmentType: one of "full-time", "part-time", "contract", "freelance", "internship" — default "full-time"
- industry: Industry if evident — null if unclear
- department: Department if evident — null if unclear
- startDate: Start date in YYYY-MM format (estimate month if only year given, use "01")
- endDate: End date in YYYY-MM format, or null if current/present
- isCurrent: true if this is marked as current/present role
- description: Brief role summary (1-2 sentences) if available — null if not
- skills: Array of skills/technologies mentioned for this role
- highlights: Array of achievement/bullet objects, each with:
  - text: The achievement/responsibility text
  - category: one of "achievement", "responsibility", "project", "award"
  - metrics: Quantified result if present (e.g. "increased revenue 40%") — empty string if none
  - keywords: Array of relevant skill keywords from this bullet

Rules:
- Extract EVERY role, even if sparse on details
- Keep bullet points as close to original wording as possible (don't embellish)
- If dates are ambiguous (e.g. "2018-2020"), use YYYY-01 for start and YYYY-12 for end
- If a role says "Present" or "Current", set isCurrent: true and endDate: null
- Skills should be normalized (e.g. "JS" → "JavaScript", "ML" → "Machine Learning")
- Categorize highlights: achievements have metrics/results, responsibilities describe duties, projects name a deliverable

Return a JSON object:
{
  "experiences": [ ...array of experience objects... ],
  "summary": "Brief note about what was extracted (e.g. '5 roles spanning 2015-2024')"
}`;

/**
 * POST /api/experience/extract
 *
 * Accepts a resume as file upload (PDF/DOCX/TXT) or pasted text.
 * Extracts text, sends to LLM, returns structured experience entries for review.
 *
 * Body: FormData with either:
 *   - file: uploaded file (PDF, DOCX, or TXT)
 *   - text: pasted resume text
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let resumeText: string;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const pastedText = formData.get("text") as string | null;

      if (file && file.size > 0) {
        resumeText = await extractTextFromFile(file);
      } else if (pastedText && pastedText.trim().length > 20) {
        resumeText = pastedText.trim();
      } else {
        return NextResponse.json(
          { error: "Please upload a file or paste resume text" },
          { status: 400 }
        );
      }
    } else {
      // JSON body with text
      const body = await request.json();
      if (!body.text || body.text.trim().length < 20) {
        return NextResponse.json(
          { error: "Resume text must be at least 20 characters" },
          { status: 400 }
        );
      }
      resumeText = body.text.trim();
    }

    // Truncate very long resumes to avoid token limits
    if (resumeText.length > 15000) {
      resumeText = resumeText.slice(0, 15000);
    }

    // Extract structured data via LLM
    const extracted = await extractWithLLM(resumeText);

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("POST /api/experience/extract error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * Extracts plain text from an uploaded file (PDF, DOCX, or TXT).
 */
async function extractTextFromFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (filename.endsWith(".pdf")) {
    // PDF parsing (pdf-parse v2)
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const pages = result?.pages || [];
    const text = pages.map((p: { text: string }) => p.text).join("\n");

    if (!text || text.trim().length < 10) {
      throw new Error("Could not extract text from PDF. It may be image-based — try pasting the text instead.");
    }
    return text;
  } else if (filename.endsWith(".docx")) {
    // DOCX parsing
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value || result.value.trim().length < 10) {
      throw new Error("Could not extract text from DOCX file.");
    }
    return result.value;
  } else if (filename.endsWith(".txt") || filename.endsWith(".md")) {
    // Plain text
    return buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${filename}. Please upload a PDF, DOCX, or TXT file.`);
  }
}

/**
 * Sends resume text to the LLM and returns structured experience data.
 * Falls back to a basic regex extraction if no API key is available.
 */
async function extractWithLLM(resumeText: string): Promise<{
  experiences: unknown[];
  summary: string;
  source: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback: return the raw text with a message
    return {
      experiences: [],
      summary: "No OpenAI API key configured. Cannot extract automatically. Please add entries manually.",
      source: "none",
    };
  }

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Here is the resume text to parse:\n\n${resumeText}` },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from LLM");
  }

  const parsed = JSON.parse(content);

  return {
    experiences: parsed.experiences || [],
    summary: parsed.summary || `Extracted ${(parsed.experiences || []).length} roles`,
    source: "gpt-4o-mini",
  };
}
