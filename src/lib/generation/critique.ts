/**
 * Stage 5: Critique Pass (LLM Call #2)
 *
 * Receives ONLY the rendered text + rubric + doc-type policy.
 * Does NOT receive the generation prompt or claims context.
 * Returns structured issues with severity.
 */

import { guardedLLMCall } from "@/lib/guarded-llm";
import {
  CRITIQUE_SYSTEM_PROMPT,
  buildCritiqueUserPrompt,
} from "@/lib/prompts/critique";
import type { CritiqueIssue, CritiqueResult, DocumentType, SpanOutput } from "./types";
import { renderSpansToText } from "./deterministic";

const CRITIQUE_MODEL = "gpt-4o-2024-08-06";
const CRITIQUE_TEMPERATURE = 0.2;

/**
 * Runs the critique pass on generated text.
 * Only receives rendered text + rubric, NOT generation prompt or claims.
 */
export async function runCritique(
  spans: SpanOutput[],
  documentType: DocumentType
): Promise<CritiqueResult> {
  const renderedText = renderSpansToText(spans);
  const userPrompt = buildCritiqueUserPrompt(renderedText, documentType);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: CRITIQUE_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await guardedLLMCall({
    model: CRITIQUE_MODEL,
    temperature: CRITIQUE_TEMPERATURE,
    messages,
    jsonMode: true,
  });

  // Parse response
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    // If critique fails to parse, treat as passed (do not block generation on critique failures)
    return { passed: true, issues: [] };
  }

  const data = parsed as Record<string, unknown>;

  // Extract issues
  const rawIssues = Array.isArray(data.issues) ? data.issues : [];
  const issues: CritiqueIssue[] = rawIssues.map((issue: unknown) => {
    const i = issue as Record<string, unknown>;
    return {
      severity: (i.severity as "critical" | "major" | "minor") || "minor",
      location: (i.location as string) || "unknown",
      description: (i.description as string) || "No description",
    };
  });

  // Determine if passed: no critical issues and at most 2 major issues
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const majorCount = issues.filter((i) => i.severity === "major").length;
  const passed = criticalCount === 0 && majorCount <= 2;

  return { passed, issues };
}
