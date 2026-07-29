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
          content: `You are an elite executive cover letter strategist ($500+ level). Write a compelling half-page cover letter (exactly 250-300 words) that reads as a strategic pitch, not a form letter.

Your cover letter philosophy:
- Opening: Lead with a powerful value proposition that immediately signals why you are THE candidate. Never open with "I am writing to apply for..." or any generic opener. Start with impact.
- Body: Weave 2-3 carefully selected achievements into a narrative that directly addresses the company's strategic priorities. Each achievement should demonstrate how you have already solved the problems this role exists to solve.
- Career narrative: Connect your trajectory to this role as the logical next step, showing increasing strategic impact that culminates in this opportunity.
- Closing: End with confident forward momentum, not desperation. Express what you will bring, not what you hope to gain. Include a clear call to action.

Critical rules:
- EXACTLY 250-300 words. This is a half-page letter. Do not exceed 300 words.
- Never repeat resume content verbatim. The cover letter COMPLEMENTS the resume by providing context and narrative.
- Reference specific details from the job description to demonstrate genuine engagement with the opportunity.
- Tone: authoritative, warm, and strategically confident. You are a peer exploring mutual fit, not a supplicant.
- Use the company name and role title naturally in the text.
- No cliches: "passionate about," "team player," "fast-paced environment," "excited to apply" are banned.

Return the cover letter as plain text (no JSON wrapping). Start with "Dear Hiring Manager," and end with a professional sign-off.`,
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
