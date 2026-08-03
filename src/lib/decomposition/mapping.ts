/**
 * Maps claims to hiring questions using keyword overlap matching.
 */

export interface HiringQuestion {
  question: string;
  rationale: string;
}

export interface MappedHiringQuestion {
  question: string;
  rationale: string;
  claimIds: string[];
  gap: boolean;
}

export interface ClaimForMapping {
  id: string;
  statement: string;
  artifacts: Array<{ passageText: string }>;
}

export interface MappingReport {
  questions: MappedHiringQuestion[];
  covered: Array<{ question: string; claimIds: string[] }>;
  gaps: Array<{ question: string }>;
}

// Common stop words to exclude from matching
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "has", "have", "been", "some", "them",
  "than", "its", "over", "such", "that", "this", "with", "will", "each",
  "from", "they", "into", "also", "more", "other", "what", "when", "where",
  "which", "their", "there", "these", "those", "would", "about", "could",
  "should", "does", "through", "while", "being", "after", "before",
  "between", "under", "above", "both", "just", "only", "very",
]);

// Minimum match threshold: a claim must share at least this many significant words
const MIN_WORD_OVERLAP = 3;

/**
 * Extracts significant words from text (words with length > 3, not stop words).
 */
export function extractSignificantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

/**
 * Checks if a claim matches a question based on keyword overlap.
 * A claim matches if its statement or any artifact passageText shares
 * at least MIN_WORD_OVERLAP significant words with the question.
 */
function claimMatchesQuestion(
  claim: ClaimForMapping,
  questionWords: string[]
): boolean {
  // Build a set of words from the claim statement + all artifact passages
  const claimTextParts = [claim.statement];
  for (const artifact of claim.artifacts) {
    claimTextParts.push(artifact.passageText);
  }
  const claimWords = new Set(
    extractSignificantWords(claimTextParts.join(" "))
  );

  // Count overlapping words
  let overlap = 0;
  for (const word of questionWords) {
    if (claimWords.has(word)) {
      overlap++;
      if (overlap >= MIN_WORD_OVERLAP) return true;
    }
  }

  return false;
}

/**
 * Maps claims to hiring questions.
 * For each question, finds claims whose statement or artifact passageText
 * shares significant keywords with the question text.
 *
 * Returns updated questions with claimIds and gap flags, plus a structured report.
 */
export function mapClaimsToQuestions(
  hiringQuestions: HiringQuestion[],
  claims: ClaimForMapping[]
): MappingReport {
  const questions: MappedHiringQuestion[] = hiringQuestions.map((hq) => {
    // Use only question text for matching (not rationale) to reduce false positives
    const questionWords = extractSignificantWords(hq.question);

    const matchedClaimIds: string[] = [];
    for (const claim of claims) {
      if (claimMatchesQuestion(claim, questionWords)) {
        matchedClaimIds.push(claim.id);
      }
    }

    return {
      question: hq.question,
      rationale: hq.rationale,
      claimIds: matchedClaimIds,
      gap: matchedClaimIds.length === 0,
    };
  });

  const covered = questions
    .filter((q) => !q.gap)
    .map((q) => ({ question: q.question, claimIds: q.claimIds }));

  const gaps = questions
    .filter((q) => q.gap)
    .map((q) => ({ question: q.question }));

  return { questions, covered, gaps };
}
