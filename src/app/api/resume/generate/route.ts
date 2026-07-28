import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a professional resume writer. Given a target role and a collection of the user's keywords (skills) and resume-ready phrases extracted from job descriptions they've saved, generate a tailored professional resume.

Instructions:
- Use the provided phrases as raw material — rewrite them in first person as accomplishments
- Prioritize phrases and keywords that are most relevant to the target role
- Organize into standard resume sections: Summary, Experience Highlights, Key Skills, and Additional Qualifications
- The Summary should be 2-3 sentences positioning the candidate for the target role
- Experience Highlights should be 6-10 bullet points (best accomplishments rewritten)
- Key Skills should list the most relevant 8-12 keywords
- Write in professional, concise resume language
- Do NOT invent achievements — only use what's provided in the phrases

Return a JSON object with this structure:
{
  "targetRole": "the role",
  "summary": "2-3 sentence professional summary",
  "experienceHighlights": ["bullet 1", "bullet 2", ...],
  "keySkills": ["skill1", "skill2", ...],
  "additionalQualifications": ["qual 1", "qual 2", ...]
}`;

/**
 * POST /api/resume/generate
 *
 * Generates a tailored resume draft using the user's saved phrases and keywords.
 * Body: { targetRole: string, topN?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetRole, topN = 50 } = body;

    if (!targetRole || typeof targetRole !== "string") {
      return NextResponse.json(
        { error: "targetRole (string) is required" },
        { status: 400 }
      );
    }

    // Gather user's data: top keywords and best phrases
    const jobs = await prisma.job.findMany({
      include: {
        skills: true,
        responsibilities: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "No jobs saved yet. Add some job descriptions first." },
        { status: 400 }
      );
    }

    // Collect all keywords with frequency
    const keywordFreq = new Map<string, number>();
    for (const job of jobs) {
      for (const skill of job.skills) {
        keywordFreq.set(skill.name, (keywordFreq.get(skill.name) || 0) + 1);
      }
    }

    // Top keywords sorted by frequency
    const topKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([kw, count]) => `${kw} (${count} jobs)`);

    // Collect all phrases
    const allPhrases: { text: string; category: string; keywords: string[] }[] = [];
    for (const job of jobs) {
      for (const resp of job.responsibilities) {
        allPhrases.push({
          text: resp.text,
          category: resp.category,
          keywords: (resp.keywords as string[]) || [],
        });
      }
    }

    // Take top N phrases (prioritize those with keywords matching the target role)
    const targetLower = targetRole.toLowerCase();
    const scoredPhrases = allPhrases.map((p) => {
      const relevance = p.keywords.some((k) => targetLower.includes(k.toLowerCase())) ? 2 : 1;
      return { ...p, relevance };
    });
    scoredPhrases.sort((a, b) => b.relevance - a.relevance);
    const selectedPhrases = scoredPhrases.slice(0, topN);

    // Build the prompt
    const userPrompt = `Target Role: ${targetRole}

Top Keywords (by frequency across ${jobs.length} saved job descriptions):
${topKeywords.join("\n")}

Resume-Ready Phrases (${selectedPhrases.length} total):
${selectedPhrases.map((p) => `- [${p.category.toUpperCase()}] ${p.text}`).join("\n")}

Generate a tailored resume for the target role using these keywords and phrases as raw material.`;

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: return a structured template without LLM
      return NextResponse.json({
        targetRole,
        summary: `Experienced professional seeking a ${targetRole} position. Bringing expertise in ${topKeywords.slice(0, 5).map((k) => k.split(" (")[0]).join(", ")}.`,
        experienceHighlights: selectedPhrases
          .filter((p) => p.category === "responsibility")
          .slice(0, 8)
          .map((p) => p.text),
        keySkills: Array.from(keywordFreq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([kw]) => kw),
        additionalQualifications: selectedPhrases
          .filter((p) => p.category === "qualification")
          .slice(0, 5)
          .map((p) => p.text),
        generatedAt: new Date().toISOString(),
        source: "template",
      });
    }

    // LLM generation
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from LLM" },
        { status: 500 }
      );
    }

    const resume = JSON.parse(content);

    return NextResponse.json({
      ...resume,
      generatedAt: new Date().toISOString(),
      source: "gpt-4o-mini",
      stats: {
        jobsAnalyzed: jobs.length,
        phrasesConsidered: selectedPhrases.length,
        keywordsAvailable: keywordFreq.size,
      },
    });
  } catch (err) {
    console.error("POST /api/resume/generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate resume", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
