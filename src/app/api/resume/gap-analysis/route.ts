import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/resume/gap-analysis
 *
 * Compare a specific job description against your saved keywords and phrases.
 * Returns: what you have (matched), what you're missing (gaps), and relevant phrases.
 *
 * Body: { description: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== "string" || description.length < 20) {
      return NextResponse.json(
        { error: "description (string, 20+ chars) is required" },
        { status: 400 }
      );
    }

    // Get all user's saved keywords with frequency
    const allSkills = await prisma.jobSkill.findMany({
      select: { name: true },
    });

    const userKeywords = new Map<string, number>();
    for (const skill of allSkills) {
      const lower = skill.name.toLowerCase();
      userKeywords.set(lower, (userKeywords.get(lower) || 0) + 1);
    }

    // Extract keywords from the pasted JD
    // Try LLM first, fall back to keyword matching
    let jdKeywords: string[] = [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const OpenAI = (await import("openai")).default;
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: `Extract all technical skills, tools, methodologies, and competencies from this job description. Return a JSON object: { "keywords": ["keyword1", "keyword2", ...] }. Include both hard skills (Python, AWS, SQL) and soft skills (leadership, stakeholder management). Return 10-25 keywords.`,
            },
            { role: "user", content: description },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          jdKeywords = parsed.keywords || [];
        }
      } catch {
        // LLM failed — fall back to regex
      }
    }

    // Regex fallback if LLM didn't produce keywords
    if (jdKeywords.length === 0) {
      jdKeywords = extractKeywordsRegex(description);
    }

    // Compare: what user has vs. what JD wants
    const matched: { keyword: string; userCount: number }[] = [];
    const gaps: string[] = [];

    for (const jdKw of jdKeywords) {
      const lower = jdKw.toLowerCase();
      const count = userKeywords.get(lower);
      if (count && count > 0) {
        matched.push({ keyword: jdKw, userCount: count });
      } else {
        gaps.push(jdKw);
      }
    }

    // Sort matched by user frequency (strongest matches first)
    matched.sort((a, b) => b.userCount - a.userCount);

    // Find relevant phrases the user already has for matched keywords
    const matchedKeywordNames = matched.map((m) => m.keyword.toLowerCase());
    const relevantPhrases = await prisma.jobResponsibility.findMany({
      where: {
        keywords: { hasSome: matched.map((m) => m.keyword) },
      },
      include: {
        job: { select: { title: true, company: true } },
      },
      take: 20,
    });

    // Also try case-insensitive match on phrases via job skills
    let additionalPhrases: typeof relevantPhrases = [];
    if (relevantPhrases.length < 5 && matchedKeywordNames.length > 0) {
      additionalPhrases = await prisma.jobResponsibility.findMany({
        where: {
          job: {
            skills: {
              some: {
                name: { in: matched.map((m) => m.keyword), mode: "insensitive" },
              },
            },
          },
        },
        include: {
          job: { select: { title: true, company: true } },
        },
        take: 15,
      });
    }

    // Deduplicate phrases
    const seenPhraseIds = new Set(relevantPhrases.map((p) => p.id));
    const allRelevant = [
      ...relevantPhrases,
      ...additionalPhrases.filter((p) => !seenPhraseIds.has(p.id)),
    ].slice(0, 20);

    const coveragePercent = jdKeywords.length > 0
      ? Math.round((matched.length / jdKeywords.length) * 100)
      : 0;

    return NextResponse.json({
      jdKeywordsFound: jdKeywords.length,
      coverage: coveragePercent,
      matched: matched.map((m) => ({
        keyword: m.keyword,
        strength: m.userCount >= 5 ? "strong" : m.userCount >= 2 ? "moderate" : "weak",
        jobCount: m.userCount,
      })),
      gaps,
      relevantPhrases: allRelevant.map((p) => ({
        id: p.id,
        text: p.text,
        category: p.category,
        jobTitle: p.job.title,
        company: p.job.company,
      })),
    });
  } catch (err) {
    console.error("POST /api/resume/gap-analysis error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

/**
 * Simple regex-based keyword extraction fallback.
 */
function extractKeywordsRegex(text: string): string[] {
  const patterns = [
    /\b(python|java|javascript|typescript|go|rust|ruby|scala|kotlin|swift|c\+\+|c#|r\b|sql|graphql)\b/gi,
    /\b(react|angular|vue|next\.?js|node\.?js|express|django|flask|spring|rails)\b/gi,
    /\b(aws|azure|gcp|docker|kubernetes|terraform|jenkins|ci\/cd|git|linux)\b/gi,
    /\b(machine learning|deep learning|nlp|ai|data science|analytics|statistics)\b/gi,
    /\b(product management|project management|agile|scrum|kanban|jira|confluence)\b/gi,
    /\b(leadership|strategy|stakeholder|cross-functional|mentoring|coaching)\b/gi,
    /\b(postgresql|mysql|mongodb|redis|elasticsearch|kafka|spark|airflow|dbt)\b/gi,
    /\b(figma|design thinking|user research|ux|ui|accessibility)\b/gi,
    /\b(communication|collaboration|problem.solving|critical thinking|innovation)\b/gi,
  ];

  const found = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        found.add(m.trim());
      }
    }
  }

  return Array.from(found);
}
