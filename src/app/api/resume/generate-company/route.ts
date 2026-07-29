import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COMPANY_TARGETED_PROMPT = `You are an elite executive resume strategist charging $500+ per engagement. You are creating a TARGETED resume for a specific role at a specific company.

You have been given:
- The user's actual work experience
- A specific job description at the target company
- Company intelligence (notes, culture, strategy info) that the user has gathered

Your approach:
- Craft a powerful executive brand narrative tailored to THIS specific role
- Use the company intelligence to align language and positioning with their culture
- Position accomplishments using language that resonates with this company
- Prioritize skills and achievements that directly match the job requirements
- Use industry-standard terminology from the job description

Instructions:
- Use the user's ACTUAL work experience as the primary source of truth
- Transform their experience into compelling strategic narratives for THIS specific role
- Incorporate company-specific language and priorities from the intelligence notes
- Do NOT invent achievements, but DO frame existing ones to match company priorities
- Every bullet should answer: "Why is this person perfect for THIS role at THIS company?"

Return a JSON object with this structure:
{
  "targetRole": "the role title",
  "summary": "2-3 sentence executive value proposition tailored to this company",
  "workExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location or null",
      "startDate": "ISO date string",
      "endDate": "ISO date string or null",
      "isCurrent": true/false,
      "bullets": ["strategic achievement 1", "strategic achievement 2"]
    }
  ],
  "keySkills": ["skill1", "skill2", ...],
  "additionalQualifications": ["qual 1", "qual 2", ...]
}`;

const COMPANY_GENERIC_PROMPT = `You are an elite executive resume strategist charging $500+ per engagement. You are creating a GENERIC resume optimized for ALL positions at a specific company.

You have been given:
- The user's actual work experience
- Multiple job descriptions from the same company
- Company intelligence (notes, culture, strategy info) that the user has gathered

Your approach:
- Identify common themes across all roles at this company
- Use company intelligence to align with their culture and values
- Create a versatile resume that positions the user as a strong fit for this company overall
- Emphasize skills that appear across multiple positions at this company
- Frame achievements using language that resonates with this company's culture

Instructions:
- Use the user's ACTUAL work experience as the primary source of truth
- Analyze all positions at this company to identify the most demanded skills
- Generate a resume optimized for this specific company (not generic market)
- Incorporate company-specific language from intelligence notes
- Do NOT invent achievements, but DO select and frame ones that align with company values

Return a JSON object with this structure:
{
  "targetRole": "Role optimized for [Company Name]",
  "summary": "2-3 sentence value proposition tailored to this company",
  "workExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location or null",
      "startDate": "ISO date string",
      "endDate": "ISO date string or null",
      "isCurrent": true/false,
      "bullets": ["strategic achievement 1", "strategic achievement 2"]
    }
  ],
  "keySkills": ["skill1", "skill2", ...],
  "additionalQualifications": ["qual 1", "qual 2", ...]
}`;

/**
 * POST /api/resume/generate-company
 *
 * Company-scoped resume generation.
 * Body: { companySlug: string, jobId?: string, mode: 'targeted' | 'generic' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companySlug, jobId, mode = "generic" } = body;

    if (!companySlug || typeof companySlug !== "string") {
      return NextResponse.json(
        { error: "companySlug (string) is required" },
        { status: 400 }
      );
    }

    if (mode === "targeted" && !jobId) {
      return NextResponse.json(
        { error: "jobId is required for targeted mode" },
        { status: 400 }
      );
    }

    // Fetch company with jobs
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      include: {
        jobs: {
          include: {
            skills: true,
            responsibilities: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Fetch user's experience
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
      // Experience table might not exist yet
    }

    // Get relevant jobs based on mode
    const relevantJobs = mode === "targeted" && jobId
      ? company.jobs.filter((j) => j.id === jobId)
      : company.jobs;

    if (relevantJobs.length === 0 && experiences.length === 0) {
      return NextResponse.json(
        { error: "No jobs or experience data available for this company." },
        { status: 400 }
      );
    }

    // Collect keywords from company jobs
    const keywordFreq = new Map<string, number>();
    for (const job of relevantJobs) {
      for (const skill of job.skills) {
        const lower = skill.name.toLowerCase();
        keywordFreq.set(lower, (keywordFreq.get(lower) || 0) + 1);
      }
    }

    // Add experience skills (weighted higher)
    for (const exp of experiences) {
      for (const skill of exp.skills) {
        const lower = skill.name.toLowerCase();
        keywordFreq.set(lower, (keywordFreq.get(lower) || 0) + 2);
      }
    }

    const topKeywords = Array.from(keywordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([kw, count]) => `${kw} (score: ${count})`);

    // Build experience section
    const experienceSection = experiences.map((exp) => {
      const duration = exp.isCurrent
        ? `${exp.startDate.toISOString().slice(0, 7)} - Present`
        : `${exp.startDate.toISOString().slice(0, 7)} - ${exp.endDate?.toISOString().slice(0, 7) || "Present"}`;

      const highlights = exp.highlights.map((h) => {
        let bullet = `[${h.category.toUpperCase()}] ${h.text}`;
        if (h.metrics) bullet += ` (${h.metrics})`;
        return bullet;
      });

      const skills = exp.skills.map((s) => s.name).join(", ");

      return `### ${exp.title} at ${exp.company}${exp.location ? ` (${exp.location})` : ""}
Duration: ${duration} | Type: ${exp.employmentType}${exp.industry ? ` | Industry: ${exp.industry}` : ""}
Skills: ${skills || "none listed"}
Highlights:
${highlights.length > 0 ? highlights.map((h) => `- ${h}`).join("\n") : "- No highlights added"}`;
    }).join("\n\n");

    // Collect phrases from relevant jobs
    const allPhrases: { text: string; category: string; keywords: string[] }[] = [];
    for (const job of relevantJobs) {
      for (const resp of job.responsibilities) {
        allPhrases.push({
          text: resp.text,
          category: resp.category,
          keywords: (resp.keywords as string[]) || [],
        });
      }
    }

    const selectedPhrases = allPhrases.slice(0, 50);

    // Build user prompt
    let userPrompt: string;
    const companyIntelligence = company.notes
      ? `\n## COMPANY INTELLIGENCE\nThe user has the following intelligence about ${company.name}:\n${company.notes}\n`
      : "";

    if (mode === "targeted" && relevantJobs.length > 0) {
      const targetJob = relevantJobs[0];
      userPrompt = `Target Company: ${company.name}
Target Role: ${targetJob.title}
${companyIntelligence}
## JOB DESCRIPTION DETAILS
Title: ${targetJob.title}
Skills required: ${targetJob.skills.map((s) => s.name).join(", ")}
${targetJob.responsibilities.length > 0 ? `Key requirements:\n${targetJob.responsibilities.map((r) => `- [${r.category}] ${r.text}`).join("\n")}` : ""}

${experiences.length > 0 ? `## YOUR WORK EXPERIENCE (${experiences.length} roles)\n${experienceSection}` : "## NO WORK EXPERIENCE ENTERED YET\nUse job description phrases to infer experience."}

## TRACKED KEYWORDS (from this company's jobs + your experience)
${topKeywords.join("\n")}

${selectedPhrases.length > 0 ? `## KEY PHRASES FROM JOB\n${selectedPhrases.slice(0, 20).map((p) => `- [${p.category.toUpperCase()}] ${p.text}`).join("\n")}` : ""}

Generate a strategically positioned resume targeting this specific role at ${company.name}.`;
    } else {
      // Generic mode
      const jobSummaries = relevantJobs.slice(0, 20).map((job) => {
        const skills = job.skills.map((s) => s.name).join(", ");
        return `- ${job.title}: [${skills}]`;
      }).join("\n");

      userPrompt = `Target Company: ${company.name}
${companyIntelligence}
## ALL POSITIONS AT ${company.name.toUpperCase()} (${relevantJobs.length} jobs)
${jobSummaries}

${experiences.length > 0 ? `## YOUR WORK EXPERIENCE (${experiences.length} roles)\n${experienceSection}` : "## NO WORK EXPERIENCE ENTERED YET\nUse job description phrases to infer experience."}

## MOST IN-DEMAND SKILLS AT ${company.name.toUpperCase()}
${topKeywords.join("\n")}

${selectedPhrases.length > 0 ? `## KEY PHRASES FROM ${company.name.toUpperCase()} JOB DESCRIPTIONS\n${selectedPhrases.slice(0, 30).map((p) => `- [${p.category.toUpperCase()}] ${p.text}`).join("\n")}` : ""}

Generate a resume optimized for ${company.name} that maximizes fit across all their positions.`;
    }

    // Check for API key
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

      const displayRole = mode === "targeted" && relevantJobs.length > 0
        ? `${relevantJobs[0].title} at ${company.name}`
        : `Resume for ${company.name}`;

      return NextResponse.json({
        targetRole: displayRole,
        summary: mode === "targeted" && relevantJobs.length > 0
          ? `Experienced professional targeting a ${relevantJobs[0].title} position at ${company.name}. Bringing expertise in ${topKeywords.slice(0, 5).map((k) => k.split(" (")[0]).join(", ")}.`
          : `Versatile professional with expertise spanning ${topKeywords.slice(0, 5).map((k) => k.split(" (")[0]).join(", ")}. Well-positioned for multiple roles at ${company.name}.`,
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
        mode,
        company: company.name,
        stats: {
          jobsAnalyzed: relevantJobs.length,
          experienceRoles: experiences.length,
          phrasesConsidered: selectedPhrases.length,
          keywordsAvailable: keywordFreq.size,
        },
      });
    }

    // LLM generation
    const openai = new OpenAI({ apiKey });
    const systemPrompt = mode === "targeted" ? COMPANY_TARGETED_PROMPT : COMPANY_GENERIC_PROMPT;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
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
      mode,
      company: company.name,
      stats: {
        jobsAnalyzed: relevantJobs.length,
        experienceRoles: experiences.length,
        phrasesConsidered: selectedPhrases.length,
        keywordsAvailable: keywordFreq.size,
      },
    });
  } catch (err) {
    console.error("POST /api/resume/generate-company error:", err);
    return NextResponse.json(
      { error: "Failed to generate resume", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
