/**
 * Stage 6: Revision Pass (LLM Call #3, conditional)
 *
 * Revises only affected spans while preserving claim attribution.
 * Re-runs deterministic checks on revised output.
 * Maximum one revision - second failure means generation fails entirely.
 */

import { guardedLLMCall } from "@/lib/guarded-llm";
import { runDeterministicChecks } from "./deterministic";
import type {
  CritiqueIssue,
  DocumentType,
  RevisionResult,
  SpanOutput,
} from "./types";

const REVISION_MODEL = "gpt-4o-2024-08-06";
const REVISION_TEMPERATURE = 0.2;

const REVISION_SYSTEM_PROMPT = `You are a professional document editor. You revise specific sections of a document to address identified issues while preserving the document's attribution structure.

CRITICAL OUTPUT FORMAT:
You MUST return a JSON object with a "spans" array. Each span preserves the original attribution (claimId) while improving the text. NEVER remove claim attribution.

Output schema:
{
  "spans": [
    {
      "text": "string - the revised text segment",
      "claimId": "string | null - preserved from original or null if model-supplied",
      "modelSupplied": boolean - true if not grounded in a specific claim
    }
  ]
}

REVISION RULES:
- Only modify spans affected by the identified issues
- Preserve claimId attribution on all factual spans
- Do not invent new facts or metrics
- Maintain the document's overall structure and flow
- Fix ONLY the identified issues, do not rewrite unnecessarily
- Keep the same approximate length

If you cannot produce valid span-attributed JSON, return: { "error": "description of the problem" }`;

/**
 * Runs the revision pass on spans that failed critique.
 */
export async function runRevision(
  originalSpans: SpanOutput[],
  issues: CritiqueIssue[],
  documentType: DocumentType
): Promise<RevisionResult> {
  const renderedOriginal = originalSpans.map((s) => s.text).join("");

  const issuesList = issues
    .map(
      (issue) =>
        `- [${issue.severity}] at "${issue.location}": ${issue.description}`
    )
    .join("\n");

  const spansJson = JSON.stringify(
    originalSpans.map((s, i) => ({
      index: i,
      text: s.text,
      claimId: s.claimId,
      modelSupplied: s.modelSupplied,
    })),
    null,
    2
  );

  const userPrompt = `Revise the following ${documentType} to address the identified issues. Return the complete revised spans array.

ISSUES TO ADDRESS:
${issuesList}

CURRENT SPANS (preserve claimId attribution):
${spansJson}

RENDERED TEXT:
${renderedOriginal}

Revise only the affected spans. Preserve all claimId attributions. Fix the identified issues without rewriting the entire document.`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: REVISION_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  let response: string;
  try {
    response = await guardedLLMCall({
      model: REVISION_MODEL,
      temperature: REVISION_TEMPERATURE,
      messages,
      jsonMode: true,
    });
  } catch (err) {
    return {
      success: false,
      error: `Revision LLM call failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }

  // Parse revised spans
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    return {
      success: false,
      error: "Revision failed: LLM returned invalid JSON.",
    };
  }

  const data = parsed as Record<string, unknown>;

  if (data.error) {
    return {
      success: false,
      error: `Revision LLM reported error: ${data.error}`,
    };
  }

  if (!Array.isArray(data.spans)) {
    return {
      success: false,
      error: "Revision failed: response does not contain a spans array.",
    };
  }

  const revisedSpans: SpanOutput[] = (data.spans as unknown[]).map(
    (span: unknown) => {
      const s = span as Record<string, unknown>;
      return {
        text: typeof s.text === "string" ? s.text : "",
        claimId: typeof s.claimId === "string" ? s.claimId : null,
        modelSupplied: s.modelSupplied === true || s.claimId === null || s.claimId === undefined,
      };
    }
  );

  if (revisedSpans.length === 0) {
    return {
      success: false,
      error: "Revision failed: LLM returned an empty spans array.",
    };
  }

  // Re-run deterministic checks on revised output (max one revision, no loops)
  const deterministicResult = await runDeterministicChecks(
    revisedSpans,
    documentType
  );

  if (!deterministicResult.passed) {
    return {
      success: false,
      error: `Revision failed deterministic checks: ${deterministicResult.failures.join("; ")}`,
    };
  }

  return {
    success: true,
    spans: revisedSpans,
  };
}
