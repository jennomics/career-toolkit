import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getProfileContext,
  formatProfileForResume,
  getVoiceGuidance,
  checkGenerationReady,
} from "@/lib/profile-context";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";
import { guardedLLMCall } from "@/lib/guarded-llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an elite executive resume strategist charging $500+ per engagement. Your expertise transforms career histories into compelling strategic narratives that position candidates as indispensable leaders and high-value contributors.

Your approach:
- Craft a powerful executive brand narrative, not a list of duties
- Position each bullet as a strategic contribution that drove business outcomes
- Use the language of leadership: "Architected," "Spearheaded," "Pioneered," "Orchestrated," "Championed"
- Frame accomplishments in terms of business value: revenue impact, efficiency gains, team scale, market positioning
- Elevate industry-specific terminology to signal insider expertise
- Ensure the summary reads as a confident value proposition, not a bland objective statement
- Connect career trajectory dots into a coherent narrative of increasing strategic impact

Instructions:
- Use the user's ACTUAL work experience as the primary source of truth
- Transform their experience highlights into powerful, outcome-driven bullet points
- Prioritize achievements that demonstrate strategic thinking, leadership, and measurable impact
- Use tracked job keywords to inform which skills to emphasize and how to frame them
- Organize into sections: Summary, Work Experience (structured by role), Key Skills, and Additional Qualifications
- The Summary should be 2-3 sentences that read as a compelling executive value proposition
- Work Experience should list their actual roles (most relevant first) with 2-4 strategically framed bullets each
- Key Skills should list the most relevant 8-12 skills using precise industry terminology
- Do NOT invent achievements, but DO reframe existing ones to highlight strategic value and business impact
- Every bullet should answer: "So what? Why did this matter to the business?"

Return a JSON object with this structure:
{
  "targetRole": "the role",
  "summary": "2-3 sentence executive value proposition",
  "workExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location or null",
      "startDate": "ISO date string",
      "endDate": "ISO date string or null",
      "isCurrent": true/false,
      "bullets": ["strategic achievement 1", "strategic achievement 2", ...]
    }
  ],
  "keySkills": ["skill1", "skill2", ...],
  "additionalQualifications": ["qual 1", "qual 2", ...]
}`;

const GENERIC_SYSTEM_PROMPT = `You are an elite executive resume strategist charging $500+ per engagement. You are creating a GENERIC resume optimized for maximum market coverage across multiple target positions.

Your approach for generic resumes:
- Identify the common strategic themes across all target roles
- Craft a versatile executive brand that resonates across the broadest set of opportunities
- Position accomplishments using universally powerful framing: business impact, leadership scope, technical depth
- Select and emphasize transferable skills that appear most frequently across all target positions
- Use industry-standard terminology that resonates with the widest range of hiring managers and ATS systems
- Build a narrative that demonstrates adaptability and breadth without sacrificing depth

Instructions:
- Use the user's ACTUAL work experience as the primary source of truth
- Analyze all saved job descriptions to identify the MOST COMMONLY demanded skills and requirements
- Generate a resume that maximizes coverage across all saved positions, not just one
- Prioritize skills and achievements that appear across multiple job descriptions
- Frame bullets to demonstrate versatility and broad strategic impact
- The Summary should position the candidate as a versatile leader whose expertise spans the identified demand areas
- Do NOT invent achievements, but DO select and frame existing ones to maximize cross-job relevance

Return a JSON object with this structure:
{
  "targetRole": "Versatile Professional Summary",
  "summary": "2-3 sentence value proposition emphasizing breadth of impact",
  "workExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location or null",
      "startDate": "ISO date string",
      "endDate": "ISO date string or null",
      "isCurrent": true/false,
      "bullets": ["strategic achievement 1", "strategic achievement 2", ...]
    }
  ],
  "keySkills": ["skill1", "skill2", ...],
  "additionalQualifications": ["qual 1", "qual 2", ...],
  "coverageScore": 0
}`;

/**
 * POST /api/resume/generate
 *
 * Generates a tailored resume using the user's experience AND saved job data.
 * Body: { targetRole: string, topN?: number, mode?: 'targeted' | 'generic' }
 *
 * In generic mode, targetRole is optional and the resume is optimized for
 * maximum coverage across all saved jobs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetRole, topN = 50, mode = "targeted" } = body;
    const isGenericMode = mode === "generic";

    if (!isGenericMode && (!targetRole || typeof targetRole !== "string")) {
      return validationError("targetRole (string) is required for targeted mode");
    }

    // ─── Check generation readiness (unresolved profile items) ──────────────────
    const readiness = await checkGenerationReady();
    if (!readiness.ready) {
      return validationError(
        `Cannot generate resume: ${readiness.unresolvedCount} unresolved profile item(s) need resolution before generation.`
      );
    }

    // ─── Fetch candidate profile context ────────────────────────────────────────
    const profile = await getProfileContext();
    let profileResumeContext = "";
    let profileVoiceGuidance = "";
    let profileOperatingRules = "";

    if (profile) {
      profileResumeContext = formatProfileForResume(profile);
      profileVoiceGuidance = getVoiceGuidance(profile) || "";
      if (profile.resumeOperatingRules.length > 0) {
        profileOperatingRules = profile.resumeOperatingRules
          .map((r) => `- ${r}`)
          .join("\n");
      }
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
      return validationError("No experience or jobs saved yet. Add your work history or some job descriptions first.");
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
    const targetLower = isGenericMode ? "" : targetRole.toLowerCase();
    const scoredPhrases = allPhrases.map((p) => {
      if (isGenericMode) {
        // In generic mode, score by keyword frequency across all jobs
        const freqScore = p.keywords.reduce((sum, k) => sum + (keywordFreq.get(k.toLowerCase()) || 0), 0);
        return { ...p, relevance: freqScore };
      }
      const relevance = p.keywords.some((k) => targetLower.includes(k.toLowerCase())) ? 2 : 1;
      return { ...p, relevance };
    });
    scoredPhrases.sort((a, b) => b.relevance - a.relevance);
    const selectedPhrases = scoredPhrases.slice(0, topN);

    // ─── Build the prompt ───────────────────────────────────────────────────────
    let userPrompt: string;

    if (isGenericMode) {
      // Generic mode: analyze all jobs for coverage optimization
      const jobsToShow = jobs.slice(0, 20);
      const jobSummaries = jobsToShow.map((job) => {
        const skills = job.skills.map((s) => s.name).join(", ");
        return `- ${job.title} at ${job.company}: [${skills}]`;
      }).join("\n");

      const positionLabel = jobs.length > 20
        ? `TOP 20 OF ${jobs.length} SAVED POSITIONS (representative sample)`
        : `ALL SAVED POSITIONS (${jobs.length} jobs to cover)`;

      userPrompt = `MODE: GENERIC RESUME - Optimize for maximum coverage across ALL saved positions.

## ${positionLabel}
${jobSummaries}

## MOST IN-DEMAND SKILLS (by frequency across all jobs)
${topKeywords.join("\n")}

${experiences.length > 0 ? `## YOUR WORK EXPERIENCE (${experiences.length} roles)
${experienceSection}` : "## NO WORK EXPERIENCE ENTERED YET\nUse job description phrases to infer experience."}

${selectedPhrases.length > 0 ? `## HIGH-FREQUENCY PHRASES (appear across multiple job descriptions)
${selectedPhrases.slice(0, 30).map((p) => `- [${p.category.toUpperCase()}] ${p.text}`).join("\n")}` : ""}

Generate a generic resume that maximizes coverage across ALL the saved positions above. Focus on the most commonly demanded skills and frame achievements to demonstrate breadth of strategic impact.

After generating, calculate a coverageScore (0-100) representing what percentage of the saved jobs' key requirements this resume addresses.`;
    } else {
      userPrompt = `Target Role: ${targetRole}

${experiences.length > 0 ? `## YOUR WORK EXPERIENCE (${experiences.length} roles)
This is the user's actual career history. Use this as the primary source for the Work Experience section.

${experienceSection}` : "## NO WORK EXPERIENCE ENTERED YET\nUse job description phrases to infer experience."}

## TRACKED KEYWORDS (from ${jobs.length} saved job descriptions + your experience)
These indicate market demand and your skill profile:
${topKeywords.join("\n")}

${selectedPhrases.length > 0 ? `## RESUME-READY PHRASES (from tracked job descriptions)
Use these for language and framing inspiration:
${selectedPhrases.slice(0, 30).map((p) => `- [${p.category.toUpperCase()}] ${p.text}`).join("\n")}` : ""}

Generate a strategically positioned executive resume for the target role. Transform the user's experience into compelling strategic narratives that demonstrate clear business value and leadership impact.`;
    }

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

      const displayRole = isGenericMode
        ? "Generic Resume (All Positions)"
        : targetRole;

      return NextResponse.json({
        targetRole: displayRole,
        summary: isGenericMode
          ? `Versatile professional with expertise spanning ${topKeywords.slice(0, 5).map((k) => k.split(" (")[0]).join(", ")}. Proven track record of delivering strategic impact across multiple domains.`
          : `Experienced professional seeking a ${targetRole} position. Bringing expertise in ${topKeywords.slice(0, 5).map((k) => k.split(" (")[0]).join(", ")}.`,
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
        mode: isGenericMode ? "generic" : "targeted",
        ...(isGenericMode ? { coverageScore: null } : {}),
        stats: {
          jobsAnalyzed: jobs.length,
          experienceRoles: experiences.length,
          phrasesConsidered: selectedPhrases.length,
          keywordsAvailable: keywordFreq.size,
        },
      });
    }

    // ─── LLM generation ─────────────────────────────────────────────────────────
    let systemPrompt = isGenericMode ? GENERIC_SYSTEM_PROMPT : SYSTEM_PROMPT;

    // Inject profile voice guidance and operating rules into system prompt
    if (profileVoiceGuidance) {
      systemPrompt += `\n\n${profileVoiceGuidance}\n\nIMPORTANT: Match this writing style in the resume output. The tone, word choice, and cadence should feel like the candidate wrote it themselves.`;
    }
    if (profileOperatingRules) {
      systemPrompt += `\n\nRESUME OPERATING RULES (strictly follow these):\n${profileOperatingRules}`;
    }

    // Inject profile context into user prompt
    let finalUserPrompt = userPrompt;
    if (profileResumeContext) {
      finalUserPrompt = `${profileResumeContext}\n\n---\n\n${userPrompt}`;
    }

    const content = await guardedLLMCall({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: finalUserPrompt },
      ],
      jsonMode: true,
    });

    const resume = JSON.parse(content);

    return NextResponse.json({
      ...resume,
      generatedAt: new Date().toISOString(),
      source: "gpt-4o-mini",
      mode: isGenericMode ? "generic" : "targeted",
      stats: {
        jobsAnalyzed: jobs.length,
        experienceRoles: experiences.length,
        phrasesConsidered: selectedPhrases.length,
        keywordsAvailable: keywordFreq.size,
      },
    });
  } catch (err) {
    console.error("POST /api/resume/generate error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
