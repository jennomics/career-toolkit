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
      return { templateName: "cover-letter", version: COVER_LETTER_PROMPT_VERSION };
    case "custom":
      return { templateName: "resume", version: RESUME_PROMPT_VERSION };
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

  // Build the user prompt using the template's builder
  const userPrompt = buildUserPromptForType(
    documentType,
    context,
    mappedQuestions
  );

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

/**
 * Builds the appropriate user prompt based on document type.
 */
function buildUserPromptForType(
  documentType: DocumentType,
  context: ContextAssemblyResult,
  mappedQuestions: MappedQuestion[]
): string {
  const { claims, profileContext, decomposition } = context;

  const claimsList = claims
    .map((c) => `- [${c.id}] (${c.category}) ${c.statement}`)
    .join("\n");

  const questionsList = mappedQuestions
    .map((q) => `- ${q.question} (Why: ${q.rationale})`)
    .join("\n");

  const vocabList = decomposition.vocabulary.join(", ");

  switch (documentType) {
    case "cover-letter":
    case "essay":
      return `Generate a ${documentType} tailored for this role. Return structured JSON with attributed spans. ${documentType === "cover-letter" ? "Target length: 250-300 words." : ""}

TARGET ROLE: ${decomposition.responsibilities[0] || "Target Role"}
PROBLEM THIS ROLE SOLVES: ${decomposition.problemStatement}

HIRING QUESTIONS TO ADDRESS:
${questionsList}

POSTING VOCABULARY: ${vocabList}

CANDIDATE PROFILE:
${profileContext}

AVAILABLE CLAIMS (use these claimIds for attribution):
${claimsList}

Generate the ${documentType} as attributed spans. Every factual statement must reference a claimId from the list above. Use contractions naturally. Be concrete and specific.`;

    case "resume":
    case "custom":
    default:
      return `Generate a resume tailored for this role. Return structured JSON with attributed spans.

TARGET ROLE: ${decomposition.responsibilities[0] || "Target Role"}
KEY RESPONSIBILITIES:
${decomposition.responsibilities.map((r) => `- ${r}`).join("\n")}

POSTING VOCABULARY: ${vocabList}

CANDIDATE PROFILE:
${profileContext}

AVAILABLE CLAIMS (use these claimIds for attribution):
${claimsList}

Generate the resume content as attributed spans. Every factual statement must reference a claimId from the list above.`;
  }
}
