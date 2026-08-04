/**
 * Versioned prompt template for resume generation.
 * Instructs the LLM to return structured JSON with span-attributed text.
 */

import { registerPromptTemplate } from "./versions";

export const RESUME_PROMPT_VERSION = "v1.0";

export const RESUME_SYSTEM_PROMPT = `You are a professional resume writer. You produce scannable, achievement-focused resume content optimized for ATS and human reviewers.

CRITICAL OUTPUT FORMAT:
You MUST return a JSON object with a "spans" array. Each span represents a segment of the resume text with provenance attribution. NEVER return plain prose.

Output schema:
{
  "spans": [
    {
      "text": "string - the text segment",
      "claimId": "string | null - the ID of the claim this text is grounded in, or null if model-supplied",
      "modelSupplied": boolean - true if this text is not directly grounded in a specific claim
    }
  ]
}

DOCUMENT-TYPE POLICY (Resume):
- Scannable: use bullet points, short phrases, parallel structure
- Numbers early: lead with quantified impact when available
- Parallel construction: maintain consistent grammatical structure across bullets
- NOT the user's voice: resume is a professional document, not a personal letter
- Action verbs: start bullets with strong action verbs
- No first person pronouns (no "I", "my", "we")
- No fluff or filler words
- Prioritize specifics over generalities

ATTRIBUTION RULES:
- Every span of text that makes a factual claim, states a metric, or describes an achievement MUST reference the claimId it is grounded in.
- Transitional text, headers, formatting connectors, and structural elements should be marked as modelSupplied: true with claimId: null.
- If you cannot ground a factual statement in a provided claim, mark it modelSupplied: true. These will be flagged for review.
- Preserve the exact facts from claims. Do not embellish numbers or invent details.

If you cannot produce valid span-attributed JSON, return an error object: { "error": "description of the problem" }`;

export function buildResumeUserPrompt(
  claims: Array<{ id: string; statement: string; category: string }>,
  targetRole: string,
  targetCompany: string,
  responsibilities: string[],
  vocabulary: string[],
  profileContext: string
): string {
  const claimsList = claims
    .map((c) => `- [${c.id}] (${c.category}) ${c.statement}`)
    .join("\n");

  const responsibilitiesList = responsibilities
    .map((r) => `- ${r}`)
    .join("\n");

  const vocabList = vocabulary.join(", ");

  return `Generate a resume tailored for this role. Return structured JSON with attributed spans.

TARGET ROLE: ${targetRole}
TARGET COMPANY: ${targetCompany}

KEY RESPONSIBILITIES:
${responsibilitiesList}

POSTING VOCABULARY: ${vocabList}

CANDIDATE PROFILE:
${profileContext}

AVAILABLE CLAIMS (use these claimIds for attribution):
${claimsList}

Generate the resume content as attributed spans. Every factual statement must reference a claimId from the list above.`;
}

// Register this template in the versioning system
registerPromptTemplate("resume", {
  version: RESUME_PROMPT_VERSION,
  systemPrompt: RESUME_SYSTEM_PROMPT,
  userPromptBuilder: buildResumeUserPrompt as (...args: unknown[]) => string,
});
