import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a professional resume writer. Given a target role, the user's actual work experience (with highlights and skills), and a collection of keywords and phrases from job descriptions they've been tracking, generate a tailored professional resume.

Instructions:
- Use the user's ACTUAL work experience as the primary source of truth
- Use their experience highlights (achievements, projects, awards) as resume bullet points — rewrite in first person
- Use tracked job keywords to inform which skills to emphasize
- Use job description phrases as supplementary material for language/framing
- Prioritize content most relevant to the target role
- Organize into sections: Summary, Work Experience (structured by role), Key Skills, and Additional Qualifications
- The Summary should be 2-3 sentences positioning the candidate for the target role
- Work Experience should list their actual roles (most relevant first) with 2-4 tailored bullets each
- Key Skills should list the most relevant 8-12 skills (combining their experience skills and tracked keywords)
- Write in professional, concise resume language
- Do NOT invent achievements — only use what's provided

Return a JSON object with this structure:
{
  "targetRole": "the role",
  "summary": "2-3 sentence professional summary",
  "workExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location or null",
      "startDate": "ISO date string",
      "endDate": "ISO date string or null",
      "isCurrent": true/false,
      "bullets": ["achievement 1", "achievement 2", ...]
    }
  ],
  "keySkills": ["skill1", "skill2", ...],
  "additionalQualifications": ["qual 1", "qual 2", ...]
}`;

/**
 * POST /api/resume/generate
 *
 * Generates a tailored resume using the user's experience AND saved job data.
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

    // ─── Fetch user's experience ────────────────────────────────────────────────
    let experiences: {
      id: string;
      title: string;
      company: string;
      location: string | null;
      startDate: Date;
      endDate: Date | null;
      isCurrent: boolean;
      description: string | null;
      employmentType: string;
      industry: string | null;
      department: string | null;
      skills: { name: string }[];
      highlights: { text: string; category: string; metrics: string | null; keywords: string[] }[];
    }[] = [];

    try {
      experiences = await prisma.experience.findMany({
        include: { skills: true, highlights: true },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      });
    } catch {
      // Experience table might not exist yet — gracefully degrade
    }

    // ─── Fetch saved job data (keywords & phrases) ──────────────────────────────
    const jobs = await prisma.job.findMany({
      include: {
        skills: true,
        responsibilities: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Must have at least experience OR jobs
    if (jobs.length === 0 && experiences.length === 0) {
      return NextResponse.json(
        { error: "No experience or jobs saved yet. Add your work history or some job descriptions first." },
        { status: 400 }
      );
    }

    // ─── Collect all keywords with frequency (from both sources) ────────────────
    const keywordFreq = new Map<string, number>();

    // From job descriptions
    for (const job of jobs) {
      for (const skill of job.skills) {
        const lower = skill.name.toLowerCase();
        keywordFreq.set(lower, (keywordFreq.get(lower) || 0) + 1);
      }
    }

    // From experience (weighted higher — these are YOUR skills)
    for (const exp of experiences) {
      for (const skill of exp.skills) {
        const lower = skill.name.toLowerCase();
        keywordFreq.set(lower, (keywordFreq.get(lower) || 0) + 2);
      }
    }

    // Top keywords sorted by frequency
    const topKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([kw, count]) => `${kw} (score: ${count})`);

    // ─── Collect experience highlights ──────────────────────────────────────────
    const experienceSection = experiences.map((exp) => {
      const duration = exp.isCurrent
        ? `${exp.startDate.toISOString().slice(0, 7)} – Present`
        : `${exp.startDate.toISOString().slice(0, 7)} – ${exp.endDate?.toISOString().slice(0, 7) || "Present"}`;

      const highlights = exp.highlights.map((h) => {
        let bullet = `[${h.category.toUpperCase()}] ${h.text}`;
        if (h.metrics) bullet += ` (${h.metrics})`;
        return bullet;
      });

      const skills = exp.skills.map((s) => s.name).join(", ");

      return `### ${exp.title} at ${exp.company}${exp.location ? ` (${exp.location})` : ""}
Duration: ${duration} | Type: ${exp.employmentType}${exp.industry ? ` | Industry: ${exp.industry}` : ""}${exp.department ? ` | Dept: ${exp.department}` : ""}
${exp.description ? `Summary: ${exp.description}` : ""}
Skills: ${skills || "none listed"}
Highlights:
${highlights.length > 0 ? highlights.map((h) => `- ${h}`).join("\n") : "- No highlights added"}`;
    }).join("\n\n");

    // ─── Collect job description phrases ────────────────────────────────────────
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

    // Score phrases by relevance to target role
    const targetLower = targetRole.toLowerCase();
    const scoredPhrases = allPhrases.map((p) => {
      const relevance = p.keywords.some((k) => targetLower.includes(k.toLowerCase())) ? 2 : 1;
      return { ...p, relevance };
    });
    scoredPhrases.sort((a, b) => b.relevance - a.relevance);
    const selectedPhrases = scoredPhrases.slice(0, topN);

    // ─── Build the prompt ───────────────────────────────────────────────────────
    const userPrompt = `Target Role: ${targetRole}

${experiences.length > 0 ? `## YOUR WORK EXPERIENCE (${experiences.length} roles)
This is the user's actual career history. Use this as the primary source for the Work Experience section.

${experienceSection}` : "## NO WORK EXPERIENCE ENTERED YET\nUse job description phrases to infer experience."}

## TRACKED KEYWORDS (from ${jobs.length} saved job descriptions + your experience)
These indicate market demand and your skill profile:
${topKeywords.join("\n")}

${selectedPhrases.length > 0 ? `## RESUME-READY PHRASES (from tracked job descriptions)
Use these for language and framing inspiration:
${selectedPhrases.slice(0, 30).map((p) => `- [${p.category.toUpperCase()}] ${p.text}`).join("\n")}` : ""}

Generate a tailored resume for the target role. Prioritize the user's actual experience, supplemented by tracked keywords and phrases for language optimization.`;

    // ─── Check for API key ──────────────────────────────────────────────────────
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: return a structured template without LLM
      const workExperience = experiences.map((exp) => ({
        title: exp.title,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate.toISOString(),
        endDate: exp.endDate?.toISOString() || null,
        isCurrent: exp.isCurrent,
        bullets: exp.highlights
          .filter((h) => h.category === "achievement" || h.category === "project")
          .slice(0, 4)
          .map((h) => h.metrics ? `${h.text} (${h.metrics})` : h.text),
      }));

      return NextResponse.json({
        targetRole,
        summary: `Experienced professional seeking a ${targetRole} position. Bringing expertise in ${topKeywords.slice(0, 5).map((k) => k.split(" (")[0]).join(", ")}.`,
        workExperience,
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
        stats: {
          jobsAnalyzed: jobs.length,
          experienceRoles: experiences.length,
          phrasesConsidered: selectedPhrases.length,
          keywordsAvailable: keywordFreq.size,
        },
      });
    }

    // ─── LLM generation ─────────────────────────────────────────────────────────
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
        experienceRoles: experiences.length,
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
