import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json(
        { error: "bullet and jobTitle are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No OpenAI API key configured" },
        { status: 503 }
      );
    }

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `You are a professional resume writer. Improve the given resume bullet point to be more impactful and better aligned with the target job. 

Rules:
- Keep the same core accomplishment — don't invent new facts
- Use strong action verbs
- Quantify impact where possible (if the original has no metrics, you may suggest where metrics could go but don't invent numbers)
- Tailor language to match the target job's requirements and terminology
- Keep it concise (1-2 lines max)
- Use professional resume language

Return a JSON object:
{
  "improved": "The improved bullet point text",
  "explanation": "Brief explanation of what was changed and why (1 sentence)"
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
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from LLM" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({
      improved: parsed.improved || bullet,
      explanation: parsed.explanation || "Refined for clarity and impact",
    });
  } catch (err) {
    console.error("POST /api/resume/project/[id]/improve error:", err);
    const message = err instanceof Error ? err.message : "Failed to improve bullet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
