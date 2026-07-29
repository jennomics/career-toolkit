import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/resume/project/[id]/cover-letter
 *
 * Uses GPT-4o to generate a half-page cover letter.
 * Body: { jobTitle, company, jobDescription, resumeDraft }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobTitle, company, jobDescription, resumeDraft } = body;

    if (!jobTitle || !company) {
      return NextResponse.json(
        { error: "jobTitle and company are required" },
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
          content: `You are a professional cover letter writer. Write a concise, compelling half-page cover letter (about 200-300 words, 3-4 paragraphs).

Rules:
- Opening paragraph: express interest in the specific role and company, mention 1 key qualification
- Middle paragraph(s): highlight 2-3 most relevant achievements/experiences that match the job requirements
- Closing paragraph: express enthusiasm, mention availability, professional sign-off
- Tone: professional but personable, confident without being arrogant
- Do NOT use generic filler phrases ("I am writing to apply for...")
- Do NOT repeat the resume verbatim — complement it
- Reference specific details from the job description to show you've read it
- Keep it to half a page (250-300 words max)

Return the cover letter as plain text (no JSON wrapping). Start with "Dear Hiring Manager," and end with a sign-off.`,
        },
        {
          role: "user",
          content: `Target role: ${jobTitle} at ${company}

Job Description (key parts):
${jobDescription?.slice(0, 2000) || "Not provided"}

My resume highlights:
${resumeDraft?.slice(0, 3000) || "Not provided"}

Write a half-page cover letter for this role.`,
        },
      ],
    });

    const coverLetter = response.choices[0]?.message?.content;
    if (!coverLetter) {
      return NextResponse.json({ error: "No response from LLM" }, { status: 500 });
    }

    return NextResponse.json({ coverLetter });
  } catch (err) {
    console.error("POST cover-letter error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
