/**
 * Versioned prompt template for critique pass (LLM Call #2).
 * Receives rendered text + rubric only. Does NOT receive generation prompt or claims context.
 * Returns structured JSON with issues array.
 */

import { registerPromptTemplate } from "./versions";

export const CRITIQUE_PROMPT_VERSION = "v1.0";

export const CRITIQUE_SYSTEM_PROMPT = `You are a writing quality reviewer. You evaluate generated professional documents against a strict rubric. You do NOT have access to the original claims or generation prompt. You evaluate only the rendered text.

CRITICAL OUTPUT FORMAT:
You MUST return a JSON object with an "issues" array. Each issue identifies a specific quality problem.

Output schema:
{
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "location": "string - paragraph number or quoted text identifying where the issue occurs",
      "description": "string - what the problem is and why it matters",
      "ruleViolated": "string - which rubric rule was violated"
    }
  ],
  "overallScore": number (1-10, where 10 is perfect),
  "passesReview": boolean
}

RUBRIC CHECKS:
1. CONTRACTIONS_ABSENT: For cover letters and essays, contractions should be present for natural tone. Flag if no contractions are used where they should be.
2. RULE_OF_THREE: Flag any instance where three parallel items are listed purely for rhythmic cadence (e.g., "dedicated, driven, and determined"). This pattern signals formulaic writing.
3. SHORT_DECLARATIVE_ENDINGS: Flag paragraphs that all end on a short declarative sentence or aphorism. This creates a predictable, artificial rhythm.
4. EM_DASH_ASIDES: Flag em-dash asides that carry rhythm but not meaning. Em-dashes should add substantive information, not just stylistic flair.
5. ABSTRACT_NOUNS: Flag abstract nouns that replace a concrete specific (e.g., "synergy" instead of naming what was actually achieved, "excellence" instead of a measurable outcome).
6. VOCABULARY_LIFTING: Flag vocabulary that appears to be directly lifted from the job posting without integration into the candidate's own narrative. Mirror concepts, not exact phrases.
7. CLAIM_NO_EXHIBIT: Flag any factual claim that lacks a supporting exhibit (number, date, name, specific outcome). Claims should be grounded in evidence.
8. REPEATED_IDEA: Flag when the same idea appears three or more times in adjacent sentences or across paragraphs. Each idea should be stated once with impact.
9. COMPREHENSION_CHECK: Flag phrases that are hard to parse on first reading. Professional documents should be instantly comprehensible.

SEVERITY GUIDELINES:
- critical: Issue fundamentally undermines the document's purpose or credibility. Document should not be sent.
- major: Noticeable quality issue that weakens the document. Should be fixed before sending.
- minor: Stylistic concern that could be improved but does not undermine effectiveness.

PASS CRITERIA:
- passesReview = true if there are zero critical issues and at most 2 major issues.
- passesReview = false otherwise.

If you find no issues, return: { "issues": [], "overallScore": 10, "passesReview": true }`;

export function buildCritiqueUserPrompt(
  renderedText: string,
  documentType: string
): string {
  const typeContext = getDocumentTypeContext(documentType);

  return `Evaluate the following ${documentType} against the rubric. Return structured JSON with any issues found.

DOCUMENT TYPE: ${documentType}
${typeContext}

--- BEGIN DOCUMENT ---
${renderedText}
--- END DOCUMENT ---

Apply all rubric checks. Be precise about locations. Only flag genuine issues, not stylistic preferences.`;
}

function getDocumentTypeContext(documentType: string): string {
  switch (documentType) {
    case "cover-letter":
      return `DOCUMENT-TYPE EXPECTATIONS:
- Should use contractions naturally (flag if absent)
- Should be 250-300 words
- Should NOT use rule-of-three patterns
- Each idea stated only once
- Concrete specifics in every paragraph`;
    case "resume":
      return `DOCUMENT-TYPE EXPECTATIONS:
- Scannable bullet-point format
- Numbers and metrics early in bullets
- Parallel grammatical structure
- No first-person pronouns
- Action verbs leading each bullet`;
    case "essay":
      return `DOCUMENT-TYPE EXPECTATIONS:
- Should use contractions naturally (flag if absent)
- Concrete specifics throughout
- Each idea stated only once
- No rule-of-three patterns
- Clear narrative arc`;
    default:
      return `DOCUMENT-TYPE EXPECTATIONS:
- Apply general quality standards
- Flag any formulaic or templated language`;
  }
}

// Register this template in the versioning system
registerPromptTemplate("critique", {
  version: CRITIQUE_PROMPT_VERSION,
  systemPrompt: CRITIQUE_SYSTEM_PROMPT,
  userPromptBuilder: buildCritiqueUserPrompt as (...args: unknown[]) => string,
});
