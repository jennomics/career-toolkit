import { guardedLLMCall } from "@/lib/guarded-llm";
import {
  DECOMPOSITION_SYSTEM_PROMPT,
  buildDecompositionUserPrompt,
} from "@/lib/prompts/decomposition";

/**
 * Result of posting decomposition (before claim mapping).
 */
export interface DecompositionResult {
  problemStatement: string;
  responsibilities: string[];
  statedBars: string[];
  vocabulary: string[];
  hiringQuestions: Array<{ question: string; rationale: string }>;
  partialExtraction: boolean;
}

/**
 * Decomposes a job posting into structured hiring dimensions using GPT-4o.
 * Falls back to simpler extraction on LLM failure.
 */
export async function decomposePosting(
  description: string,
  title: string,
  company: string
): Promise<DecompositionResult> {
  try {
    const content = await guardedLLMCall({
      model: "gpt-4o",
      messages: [
        { role: "system", content: DECOMPOSITION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildDecompositionUserPrompt(description, title, company),
        },
      ],
      jsonMode: true,
    });

    const parsed = JSON.parse(content);

    // Validate the response structure
    if (
      !parsed.problemStatement ||
      !Array.isArray(parsed.responsibilities) ||
      !Array.isArray(parsed.statedBars) ||
      !Array.isArray(parsed.vocabulary) ||
      !Array.isArray(parsed.hiringQuestions)
    ) {
      return fallbackExtraction(description);
    }

    // Filter and validate individual hiringQuestions entries
    const validQuestions = parsed.hiringQuestions.filter(
      (q: unknown): q is { question: string; rationale?: string } =>
        typeof q === "object" &&
        q !== null &&
        typeof (q as Record<string, unknown>).question === "string" &&
        (q as Record<string, unknown>).question !== ""
    );

    return {
      problemStatement: parsed.problemStatement,
      responsibilities: parsed.responsibilities,
      statedBars: parsed.statedBars,
      vocabulary: parsed.vocabulary,
      hiringQuestions: validQuestions.map(
        (q: { question: string; rationale?: string }) => ({
          question: q.question,
          rationale: q.rationale || "",
        })
      ),
      partialExtraction: false,
    };
  } catch {
    return fallbackExtraction(description);
  }
}

/**
 * Fallback extraction when LLM call fails.
 * Extracts responsibilities from bullet points or action verb lines.
 * Infers problemStatement from the first meaningful sentence.
 * Returns empty arrays for statedBars, vocabulary, and hiringQuestions.
 */
export function fallbackExtraction(description: string): DecompositionResult {
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract responsibilities from bullet-point lines or action-verb lines
  const actionVerbs = [
    "build", "design", "develop", "lead", "manage", "create", "implement",
    "drive", "own", "deliver", "establish", "define", "architect", "scale",
    "collaborate", "partner", "mentor", "optimize", "ensure", "oversee",
  ];

  const responsibilities: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[-*\u2022]\s*/, "");
    const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase() || "";
    const isBullet = /^[-*\u2022]/.test(line);
    const startsWithVerb = actionVerbs.includes(firstWord);

    if ((isBullet || startsWithVerb) && cleaned.length > 10) {
      responsibilities.push(cleaned);
    }

    if (responsibilities.length >= 8) break;
  }

  // Infer problem statement from the first meaningful sentence
  const firstSentence = lines.find(
    (l) => l.length > 30 && !l.startsWith("-") && !l.startsWith("*")
  );
  const problemStatement = firstSentence
    ? firstSentence.replace(/[.!?].*$/, "").trim() + "."
    : "Role purpose could not be determined from the posting.";

  return {
    problemStatement,
    responsibilities,
    statedBars: [],
    vocabulary: [],
    hiringQuestions: [],
    partialExtraction: true,
  };
}
