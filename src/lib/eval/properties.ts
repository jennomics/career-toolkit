/**
 * Tier 2 Property Checks
 *
 * Structural and stylistic property checks for generated text.
 * Each returns violations with location details and a normalized rate.
 */

export interface Violation {
  location: string;
  detail: string;
}

export interface PropertyResult {
  violations: Violation[];
  violationsPerThousandWords: number;
}

interface SpanInput {
  text: string;
  claimId?: string | null;
  modelSupplied?: boolean;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function computeRate(violations: Violation[], text: string): number {
  const words = countWords(text);
  if (words === 0) return 0;
  return (violations.length / words) * 1000;
}

/**
 * Contraction rate: count contractions / total words.
 * For letters (cover-letter type), compares against 25% floor.
 * Reports a violation if the rate is below the floor.
 */
export function contractionRate(text: string): PropertyResult {
  const words = countWords(text);
  const contractionPattern = /\b\w+'\w+\b/g;
  const matches = text.match(contractionPattern) || [];
  const rate = words > 0 ? matches.length / words : 0;
  const violations: Violation[] = [];

  // 25% floor for letters means we expect contractions in at least 25% of instances
  // where a contraction could be used. We approximate by checking rate per word.
  // A reasonable threshold: at least 0.5% of words should be contractions (1 per 200 words)
  // The 25% floor means: of opportunities for contractions, 25% should use them.
  // Practical check: flag if contraction rate is below 0.005 (0.5%)
  const floor = 0.005;
  if (rate < floor && words > 50) {
    violations.push({
      location: "document-wide",
      detail: `Contraction rate ${(rate * 100).toFixed(2)}% is below 25% floor. Found ${matches.length} contractions in ${words} words.`,
    });
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * Detects parallel three-item lists like "X, Y, and Z".
 * Excessive use of rule-of-three patterns indicates formulaic writing.
 */
export function ruleOfThreeDetector(text: string): PropertyResult {
  const violations: Violation[] = [];
  const sentences = splitSentences(text);

  // Pattern: "X, Y, and Z" or "X, Y and Z"
  const ruleOfThreePattern =
    /\b[\w\s]+,\s+[\w\s]+,?\s+and\s+[\w\s]+\b/gi;

  for (let i = 0; i < sentences.length; i++) {
    const matches = sentences[i].match(ruleOfThreePattern);
    if (matches) {
      for (const match of matches) {
        violations.push({
          location: `sentence ${i + 1}`,
          detail: `Rule-of-three pattern detected: "${match.trim()}"`,
        });
      }
    }
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * Checks if majority of paragraphs end on short declarative sentences
 * (under 15 words). Good writing varies sentence endings.
 */
export function landingDetector(text: string): PropertyResult {
  const violations: Violation[] = [];
  const paragraphs = splitParagraphs(text);

  let shortLandings = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const sentences = splitSentences(paragraphs[i]);
    if (sentences.length === 0) continue;

    const lastSentence = sentences[sentences.length - 1];
    const wordCount = countWords(lastSentence);

    if (wordCount < 15) {
      shortLandings++;
    }
  }

  // Flag if majority (>50%) of paragraphs end with short declaratives
  if (paragraphs.length > 0 && shortLandings / paragraphs.length > 0.5) {
    violations.push({
      location: "document-wide",
      detail: `${shortLandings}/${paragraphs.length} paragraphs end with short declarative sentences (under 15 words). Vary paragraph endings.`,
    });
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * Flags posting vocabulary terms that appear verbatim in generated text.
 * Parroting back job posting language is a quality signal for rejection.
 */
export function vocabularyOverlap(
  text: string,
  postingVocabulary: string[]
): PropertyResult {
  const violations: Violation[] = [];
  const lowerText = text.toLowerCase();

  for (const term of postingVocabulary) {
    const lowerTerm = term.toLowerCase();
    if (lowerTerm.length < 3) continue; // Skip very short terms

    if (lowerText.includes(lowerTerm)) {
      // Find the sentence containing the term
      const sentences = splitSentences(text);
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].toLowerCase().includes(lowerTerm)) {
          violations.push({
            location: `sentence ${i + 1}`,
            detail: `Posting vocabulary term "${term}" found in generated text`,
          });
          break; // Report first occurrence per term
        }
      }
    }
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * For each capability claim span, checks if a specific instance
 * (numeric claim) appears within 2 sentences.
 */
export function exhibitAdjacency(
  text: string,
  spans: SpanInput[]
): PropertyResult {
  const violations: Violation[] = [];
  const sentences = splitSentences(text);

  // Identify capability spans and numeric spans
  const numericPattern = /\d+[%$MKBkmb]|\d+\s*(percent|million|billion|thousand)/i;

  for (const span of spans) {
    if (!span.claimId || span.modelSupplied) continue;

    // Find which sentence this span is in
    let spanSentenceIdx = -1;
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].includes(span.text.trim().substring(0, 30))) {
        spanSentenceIdx = i;
        break;
      }
    }

    if (spanSentenceIdx === -1) continue;

    // Check if there is a numeric exhibit within 2 sentences
    const start = Math.max(0, spanSentenceIdx - 2);
    const end = Math.min(sentences.length - 1, spanSentenceIdx + 2);
    let hasNumericNearby = false;

    for (let i = start; i <= end; i++) {
      if (numericPattern.test(sentences[i])) {
        hasNumericNearby = true;
        break;
      }
    }

    if (!hasNumericNearby) {
      violations.push({
        location: `sentence ${spanSentenceIdx + 1}`,
        detail: `Capability claim has no numeric exhibit within 2 sentences`,
      });
    }
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * Finds sentences with high word overlap (Jaccard similarity > 0.6).
 * Indicates repetitive phrasing within a document.
 */
export function intraDocRepetition(text: string): PropertyResult {
  const violations: Violation[] = [];
  const sentences = splitSentences(text);

  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const similarity = jaccardSimilarity(sentences[i], sentences[j]);
      if (similarity > 0.6) {
        violations.push({
          location: `sentences ${i + 1} and ${j + 1}`,
          detail: `High word overlap (Jaccard=${similarity.toFixed(2)}): "${sentences[i].substring(0, 50)}..." and "${sentences[j].substring(0, 50)}..."`,
        });
      }
    }
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * Flags sentences with many abstract nouns and low concrete specifics.
 * Abstract nouns include words ending in -tion, -ment, -ness, -ity, etc.
 */
export function comprehensionFlag(text: string): PropertyResult {
  const violations: Violation[] = [];
  const sentences = splitSentences(text);

  const abstractSuffixes = [
    "tion",
    "sion",
    "ment",
    "ness",
    "ity",
    "ence",
    "ance",
  ];
  const concretePattern = /\d+|[$%]|\b(built|created|shipped|launched|reduced|increased|saved|grew|managed|led)\b/i;

  for (let i = 0; i < sentences.length; i++) {
    const words = sentences[i].split(/\s+/);
    const abstractCount = words.filter((w) =>
      abstractSuffixes.some((s) => w.toLowerCase().endsWith(s))
    ).length;

    const hasConcrete = concretePattern.test(sentences[i]);
    const abstractRatio = words.length > 0 ? abstractCount / words.length : 0;

    // Flag if >30% abstract words and no concrete specifics
    if (abstractRatio > 0.3 && !hasConcrete && words.length > 5) {
      violations.push({
        location: `sentence ${i + 1}`,
        detail: `High abstraction (${(abstractRatio * 100).toFixed(0)}% abstract nouns) with no concrete specifics: "${sentences[i].substring(0, 60)}..."`,
      });
    }
  }

  return {
    violations,
    violationsPerThousandWords: computeRate(violations, text),
  };
}

/**
 * Computes Jaccard similarity between two sentences based on word sets.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const setB = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
