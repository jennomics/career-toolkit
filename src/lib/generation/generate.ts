/**
 * Stage 3: Structured Generation (LLM Call #1)
 *
 * Calls the LLM to produce span-attributed JSON output.
 * NEVER returns plain prose. If JSON parsing fails or spans are not valid,
 * the generation fails with no fallback.
 */

import { guardedLLMCall } from "@/lib/guarded-llm";
import { getPromptVersion } from "@/lib/prompts/versions";
import { RESUME_PROMPT_VERSION } from "@/lib/prompts/resume";
import { COVER_LETTER_PROMPT_VERSION } from "@/lib/prompts/cover-letter";
import type {
  ContextAssemblyResult,
  DocumentType,
  GenerationResult,
  SpanOutput,
  MappedQuestion,
} from "./types";

const DEFAULT_MODEL = "gpt-4o-2024-08-06";
const DEFAULT_TEMPERATURE = 0.3;

/**
 * Gets the prompt template name and version for a document type.
 * Note: essay and custom types reuse existing templates intentionally.
 * The spec only defines dedicated policies for cover-letter and resume.
 * essay reuses cover-letter (narrative style) and custom reuses resume (structured style).
 */
function getTemplateForType(documentType: DocumentType): {
  templateName: string;
  version: string;
} {
  switch (documentType) {
    case "resume":
      return { templateName: "resume", version: RESUME_PROMPT_VERSION };
    case "cover-letter":
      return { templateName: "cover-letter", version: COVER_LETTER_PROMPT_VERSION };
    case "essay":
      // Intentional: essay reuses cover-letter template (narrative style with contractions).
      // No dedicated essay prompt is defined in the spec.
      return { templateName: "cover-letter", version: COVER_LETTER_PROMPT_VERSION };
    case "custom":
      // Intentional: custom reuses resume template (structured style).
      // No dedicated custom prompt is defined in the spec.
      return { templateName: "resume", version: RESUME_PROMPT_VERSION };
  }
}

/**
 * Builds user prompt arguments for the registered template builder based on document type.
 */
function buildUserPromptArgs(
  documentType: DocumentType,
  context: ContextAssemblyResult,
  mappedQuestions: MappedQuestion[]
): unknown[] {
  const { claims, profileContext, decomposition } = context;

  switch (documentType) {
    case "cover-letter":
    case "essay":
      return [
        claims,
        decomposition.responsibilities[0] || "Target Role",
        "", // targetCompany - not available in current context
        decomposition.problemStatement,
        mappedQuestions.map((q) => ({ question: q.question, rationale: q.rationale })),
        decomposition.vocabulary,
        profileContext,
      ];
    case "resume":
    case "custom":
    default:
      return [
        claims,
        decomposition.responsibilities[0] || "Target Role",
        "", // targetCompany - not available in current context
        decomposition.responsibilities,
        decomposition.vocabulary,
        profileContext,
      ];
  }
}

/**
 * Runs the structured generation LLM call.
 * Returns spans with claim attribution or throws on failure.
 */
export async function runGeneration(
  context: ContextAssemblyResult,
  documentType: DocumentType,
  mappedQuestions: MappedQuestion[]
): Promise<GenerationResult> {
  const { templateName, version } = getTemplateForType(documentType);
  const template = getPromptVersion(templateName, version);

  // Build user prompt using the registered template builder
  const userPromptArgs = buildUserPromptArgs(documentType, context, mappedQuestions);
  const userPrompt = template.userPromptBuilder(...userPromptArgs);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: template.systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const model = DEFAULT_MODEL;
  const temperature = DEFAULT_TEMPERATURE;

  const response = await guardedLLMCall({
    model,
    temperature,
    messages,
    jsonMode: true,
  });

  // Parse JSON response - MUST be valid span-attributed JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    throw new Error(
      "Generation failed: LLM returned invalid JSON. No fallback to unattributed prose."
    );
  }

  // Validate the response structure
  const data = parsed as Record<string, unknown>;

  // Check for error response from LLM
  if (data.error) {
    throw new Error(`Generation failed: LLM reported error - ${data.error}`);
  }

  // Validate spans array exists
  if (!Array.isArray(data.spans)) {
    throw new Error(
      "Generation failed: LLM response does not contain a spans array. No fallback to unattributed prose."
    );
  }

  // Validate each span
  const spans: SpanOutput[] = (data.spans as unknown[]).map(
    (span: unknown, index: number) => {
      const s = span as Record<string, unknown>;
      if (typeof s.text !== "string" || s.text.trim() === "") {
        throw new Error(
          `Generation failed: span at index ${index} has invalid or empty text.`
        );
      }
      return {
        text: s.text,
        claimId: typeof s.claimId === "string" ? s.claimId : null,
        modelSupplied: s.modelSupplied === true || s.claimId === null || s.claimId === undefined,
      };
    }
  );

  if (spans.length === 0) {
    throw new Error(
      "Generation failed: LLM returned an empty spans array."
    );
  }

  // Estimate token counts from the messages
  const inputTokens = Math.ceil(
    messages.map((m) => m.content).join("").length / 4
  );
  const outputTokens = Math.ceil(response.length / 4);

  return {
    spans,
    inputTokens,
    outputTokens,
    modelId: model,
    promptTemplateVersion: version,
    temperature,
  };
}
