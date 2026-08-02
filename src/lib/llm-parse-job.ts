import OpenAI from "openai";
import { isDemoMode } from "./auth";
import {
  validateInputLength,
  llmSemaphore,
  createAbortSignal,
  logLLMCost,
  MAX_OUTPUT_TOKENS,
  checkDailyBudget,
} from "./llm-guard";
import { ApiError } from "./api-error";

export interface LLMParsedJob {
  title: string;
  company: string;
  location: string;
  keywords: string[];
  phrases: {
    text: string;
    category: "responsibility" | "requirement" | "qualification";
    keywords: string[];
  }[];
}

const SYSTEM_PROMPT = `You are a job description parser that extracts structured data for resume building.

Given a raw job posting (pasted from LinkedIn or a careers page), extract:

1. **title**: The job title (e.g., "VP Data and AI")
2. **company**: The company name
3. **location**: Location (e.g., "Remote", "San Francisco, CA", "Hybrid - Austin, TX")
4. **keywords**: Technical skills, tools, methodologies, and competencies mentioned (e.g., "Python", "Machine Learning", "Stakeholder Management", "Agile"). Include both hard and soft skills. Return 5-15 keywords.
5. **phrases**: Resume-ready action phrases extracted from the description. These should be:
   - Written as accomplishment statements starting with strong action verbs
   - Suitable for directly pasting into a resume
   - Categorized as "responsibility" (what you'd DO in the role), "requirement" (what you NEED to have), or "qualification" (nice-to-have)
   - Each phrase should list which keywords from above it relates to

Return JSON only, no markdown fencing. Example format:
{
  "title": "Senior Data Engineer",
  "company": "Acme Corp",
  "location": "Remote",
  "keywords": ["Python", "Spark", "AWS", "Data Engineering", "SQL"],
  "phrases": [
    {
      "text": "Design and implement scalable data pipelines processing 10TB+ daily",
      "category": "responsibility",
      "keywords": ["Data Engineering", "Spark"]
    }
  ]
}`;

export async function llmParseJob(rawText: string): Promise<LLMParsedJob> {
  // In demo mode, return a mock response
  if (isDemoMode()) {
    return {
      title: "Demo Software Engineer",
      company: "Demo Corp",
      location: "Remote",
      keywords: ["TypeScript", "React", "Node.js"],
      phrases: [
        {
          text: "Build scalable applications",
          category: "responsibility",
          keywords: ["TypeScript"],
        },
      ],
    };
  }

  // Validate input length
  validateInputLength(rawText);

  // Check daily budget
  const budget = checkDailyBudget();
  if (!budget.allowed) {
    throw new ApiError(
      `Daily LLM budget exceeded ($${budget.spent.toFixed(2)}/$${budget.limit.toFixed(2)})`,
      "RATE_LIMITED",
      429
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set in environment");
  }

  const openai = new OpenAI({ apiKey });

  // Acquire concurrency semaphore
  await llmSemaphore.acquire();
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_object" },
    }, { signal: createAbortSignal() });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from LLM");
    }

    // Log cost
    if (response.usage) {
      logLLMCost(
        "gpt-4o-mini",
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
    }

    const parsed = JSON.parse(content) as LLMParsedJob;

    // Validate basic structure
    if (
      !parsed.title ||
      !parsed.company ||
      !Array.isArray(parsed.keywords) ||
      !Array.isArray(parsed.phrases)
    ) {
      throw new Error("LLM returned invalid structure");
    }

    return parsed;
  } finally {
    llmSemaphore.release();
  }
}
