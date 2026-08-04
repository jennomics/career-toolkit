/**
 * Versioned prompt template for cover letter generation.
 * Instructs the LLM to return structured JSON with span-attributed text.
 */

import { registerPromptTemplate } from "./versions";

export const COVER_LETTER_PROMPT_VERSION = "v1.0";

export const COVER_LETTER_SYSTEM_PROMPT = `You are a professional cover letter writer. You produce compelling, authentic cover letters that connect a candidate's experience to a specific role.

CRITICAL OUTPUT FORMAT:
You MUST return a JSON object with a "spans" array. Each span represents a segment of the cover letter text with provenance attribution. NEVER return plain prose.

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

DOCUMENT-TYPE POLICY (Cover Letter):
- Contractions required: use natural contractions (I'm, I've, we're, it's) to maintain conversational tone. Aim for at least one contraction per paragraph.
- Concrete specifics: every paragraph must contain at least one concrete detail (a number, a name, a specific technology, a measurable outcome)
- One idea stated once: never repeat the same point. Each paragraph advances the narrative.
- No rule-of-three for cadence: avoid listing three parallel items for rhythmic effect. Vary sentence structure naturally.
- 250-300 words total: the cover letter should be concise and impactful
- First person: use "I" naturally
- Opening: do NOT start with "I am writing to apply for..." or similar cliches
- Closing: end with a specific forward-looking statement, not a generic "I look forward to hearing from you"

ATTRIBUTION RULES:
- Every span of text that makes a factual claim, states a metric, or describes an achievement MUST reference the claimId it is grounded in.
- Transitional text, greetings, closings, and structural elements should be marked as modelSupplied: true with claimId: null.
- If you cannot ground a factual statement in a provided claim, mark it modelSupplied: true. These will be flagged for review.
- Preserve the exact facts from claims. Do not embellish numbers or invent details.

If you cannot produce valid span-attributed JSON, return an error object: { "error": "description of the problem" }`;

export function buildCoverLetterUserPrompt(
  claims: Array<{ id: string; statement: string; category: string }>,
  targetRole: string,
  targetCompany: string,
  problemStatement: string,
  hiringQuestions: Array<{ question: string; rationale: string }>,
  vocabulary: string[],
  profileContext: string
): string {
  const claimsList = claims
    .map((c) => `- [${c.id}] (${c.category}) ${c.statement}`)
    .join("\n");

  const questionsList = hiringQuestions
    .map((q) => `- ${q.question} (Why: ${q.rationale})`)
    .join("\n");

  const vocabList = vocabulary.join(", ");

  return `Generate a cover letter tailored for this role. Return structured JSON with attributed spans. Target length: 250-300 words.

TARGET ROLE: ${targetRole}
TARGET COMPANY: ${targetCompany}

PROBLEM THIS ROLE SOLVES: ${problemStatement}

HIRING QUESTIONS TO ADDRESS:
${questionsList}

POSTING VOCABULARY: ${vocabList}

CANDIDATE PROFILE:
${profileContext}

AVAILABLE CLAIMS (use these claimIds for attribution):
${claimsList}

Generate the cover letter as attributed spans. Every factual statement must reference a claimId from the list above. Use contractions naturally. Be concrete and specific.`;
}

// Register this template in the versioning system
registerPromptTemplate("cover-letter", {
  version: COVER_LETTER_PROMPT_VERSION,
  systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
  userPromptBuilder: buildCoverLetterUserPrompt as (
    ...args: unknown[]
  ) => string,
});
