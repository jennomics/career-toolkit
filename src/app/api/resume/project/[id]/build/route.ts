import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/resume/project/[id]/build
 *
 * Uses GPT-4o to recommend highlights for each experience role,
 * tailored to the target job. Returns structured recommendations
 * that the user can select/deselect/edit.
 *
 * Body: { experienceIds?: string[] } — optional filter to specific roles
 *
 * Returns: {
 *   roles: [{
 *     id, title, company, startDate, endDate, isCurrent,
 *     recommendedHighlights: [{ text, reason, fromHighlightId? }],
 *     allHighlights: [{ id, text, category, metrics }]
 *   }]
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Get the project
    const project = await prisma.resumeProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get the target job
    const job = await prisma.job.findUnique({
      where: { id: project.jobId },
      include: { skills: true, responsibilities: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Associated job not found" }, { status: 404 });
    }

    // Get user's experience
    let experiences = await prisma.experience.findMany({
      include: { skills: true, highlights: true },
      orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
    });

    // Optionally filter to specific roles
    if (body.experienceIds && Array.isArray(body.experienceIds)) {
      experiences = experiences.filter((e) => body.experienceIds.includes(e.id));
    }

    if (experiences.length === 0) {
      return NextResponse.json(
        { error: "No experience roles found. Add your work history first." },
        { status: 400 }
      );
    }

    // Build the prompt for GPT-4o
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback: return all highlights as recommendations without LLM ranking
      const roles = experiences.map((exp) => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        startDate: exp.startDate.toISOString(),
        endDate: exp.endDate?.toISOString() || null,
        isCurrent: exp.isCurrent,
        recommendedHighlights: exp.highlights.slice(0, 5).map((h) => ({
          text: h.text,
          reason: "All highlights included (no API key for ranking)",
          fromHighlightId: h.id,
        })),
        allHighlights: exp.highlights.map((h) => ({
          id: h.id,
          text: h.text,
          category: h.category,
          metrics: h.metrics,
        })),
      }));

      return NextResponse.json({ roles, source: "fallback" });
    }

    // Build context for the LLM
    const jobContext = `Target Role: ${job.title} at ${job.company}
Key Skills Required: ${job.skills.map((s) => s.name).join(", ")}
Job Description (first 1500 chars): ${job.description.slice(0, 1500)}`;

    const experienceContext = experiences.map((exp) => {
      const highlights = exp.highlights.map((h, i) => `  [${i}] (${h.category}) ${h.text}${h.metrics ? ` (${h.metrics})` : ""}`).join("\n");
      return `### ${exp.title} at ${exp.company} (${exp.startDate.toISOString().slice(0, 7)} - ${exp.isCurrent ? "Present" : exp.endDate?.toISOString().slice(0, 7) || "Present"})
Skills: ${exp.skills.map((s) => s.name).join(", ")}
Highlights:
${highlights || "  (none)"}`;
    }).join("\n\n");

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a resume strategist. Given a target job and a candidate's work experience with all their highlights/achievements, recommend which highlights to include on a resume for this specific job.

For each role, select the 3-5 most relevant highlights and explain why each is a good fit. Prioritize:
1. Direct skill matches with the job requirements
2. Quantified achievements
3. Leadership/impact statements relevant to the target level
4. Recent and relevant over old and tangential

Return a JSON object:
{
  "roles": [
    {
      "experienceIndex": 0,
      "recommended": [
        { "highlightIndex": 2, "reason": "Directly demonstrates X which is a key requirement" },
        { "highlightIndex": 0, "reason": "Shows quantified impact in relevant area" }
      ]
    }
  ]
}

Only include roles that are relevant to the target job. If a role has no relevant highlights, omit it.`,
        },
        {
          role: "user",
          content: `${jobContext}\n\n---\n\nCandidate's Experience:\n\n${experienceContext}\n\nWhich highlights should be on the resume for this specific job?`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from LLM" }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    // Map LLM recommendations back to actual data
    const roles = experiences.map((exp, expIdx) => {
      const llmRole = (parsed.roles || []).find(
        (r: { experienceIndex: number }) => r.experienceIndex === expIdx
      );

      const recommendedHighlights = (llmRole?.recommended || []).map(
        (rec: { highlightIndex: number; reason: string }) => {
          const h = exp.highlights[rec.highlightIndex];
          return h
            ? { text: h.text, reason: rec.reason, fromHighlightId: h.id }
            : null;
        }
      ).filter(Boolean);

      return {
        id: exp.id,
        title: exp.title,
        company: exp.company,
        startDate: exp.startDate.toISOString(),
        endDate: exp.endDate?.toISOString() || null,
        isCurrent: exp.isCurrent,
        recommendedHighlights,
        allHighlights: exp.highlights.map((h) => ({
          id: h.id,
          text: h.text,
          category: h.category,
          metrics: h.metrics,
        })),
      };
    });

    return NextResponse.json({ roles, source: "gpt-4o" });
  } catch (err) {
    console.error("POST /api/resume/project/[id]/build error:", err);
    const message = err instanceof Error ? err.message : "Failed to build resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
