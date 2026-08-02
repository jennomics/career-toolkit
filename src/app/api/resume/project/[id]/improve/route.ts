import { NextRequest, NextResponse } from "next/server";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";
import { guardedLLMCall } from "@/lib/guarded-llm";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/resume/project/[id]/improve
 *
 * Uses GPT-4o to improve a single resume bullet point, tailored to the target job.
 *
 * Body: {
 *   bullet: string,         // The current highlight text
 *   jobTitle: string,       // Target job title
 *   jobDescription: string, // Target job description (first ~1000 chars)
 *   roleTitle: string,      // The role this bullet belongs to
 *   company: string,        // The company for this role
 * }
 *
 * Returns: { improved: string, explanation: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bullet, jobTitle, jobDescription, roleTitle, company } = body;

    if (!bullet || !jobTitle) {
      return validationError("bullet and jobTitle are required");
    }

    const content = await guardedLLMCall({
      model: "gpt-4o",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are an elite executive resume writer ($500+ per engagement). Transform resume bullet points from task descriptions into powerful strategic impact statements that command attention from senior hiring managers and executive recruiters.

Your transformation approach:
- Elevate language from "did" to "led/architected/spearheaded/pioneered/orchestrated"
- Reframe tasks as strategic contributions: "Managed team" becomes "Scaled and mentored a high-performing team of X"
- Add business context: WHY did this matter? What was the strategic outcome?
- Where metrics exist, frame them as business impact (not just numbers)
- Where metrics are absent, suggest where quantification would strengthen the statement (but never invent data)
- Match terminology to the target role's seniority level and industry
- Ensure every bullet answers: "What did you do, how did you do it, and why did it matter to the business?"

Seniority-appropriate verb selection:
- Executive/VP level: Championed, Orchestrated, Pioneered, Drove, Transformed
- Director/Sr Manager: Spearheaded, Architected, Scaled, Established, Accelerated
- Manager/Lead: Led, Built, Optimized, Redesigned, Delivered
- IC/Senior IC: Engineered, Developed, Implemented, Designed, Executed

Return a JSON object:
{
  "improved": "The transformed bullet point with executive positioning",
  "explanation": "Brief explanation of the strategic reframing applied (1 sentence)"
}`,
        },
        {
          role: "user",
          content: `Target job: ${jobTitle}
${jobDescription ? `Job context: ${jobDescription.slice(0, 1000)}` : ""}

This bullet is from the role "${roleTitle}" at "${company}":

Original: "${bullet}"

Improve this bullet to be more impactful and better aligned with the target job.`,
        },
      ],
      jsonMode: true,
    });

    const parsed = JSON.parse(content);
    return NextResponse.json({
      improved: parsed.improved || bullet,
      explanation: parsed.explanation || "Refined for clarity and impact",
    });
  } catch (err) {
    console.error("POST /api/resume/project/[id]/improve error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
