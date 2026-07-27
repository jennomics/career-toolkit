/**
 * Extracts resume-ready responsibility phrases from job descriptions.
 * These are action-verb-driven statements that describe what the role does —
 * the kind of thing you'd put on a resume.
 */

const ACTION_VERBS = [
  "accelerate", "achieve", "acquire", "adapt", "administer", "advance",
  "advise", "advocate", "align", "allocate", "analyze", "anticipate",
  "apply", "architect", "assess", "automate",
  "build", "champion", "coach", "collaborate", "communicate", "conduct",
  "configure", "consolidate", "contribute", "coordinate", "create",
  "cultivate", "customize",
  "define", "deliver", "deploy", "design", "develop", "devise", "diagnose",
  "direct", "discover", "drive",
  "enable", "engineer", "ensure", "establish", "evaluate", "evolve",
  "execute", "expand",
  "facilitate", "formulate", "foster",
  "generate", "govern", "grow", "guide",
  "identify", "implement", "improve", "influence", "inform", "initiate",
  "innovate", "integrate", "investigate",
  "launch", "lead", "leverage",
  "maintain", "manage", "mentor", "migrate", "modernize", "monitor",
  "negotiate", "nurture",
  "operate", "optimize", "orchestrate", "oversee", "own",
  "partner", "perform", "pilot", "plan", "prioritize", "produce",
  "promote", "propose", "prototype", "provide",
  "recommend", "reduce", "refine", "represent", "research", "resolve",
  "review", "revitalize",
  "scale", "secure", "shape", "simplify", "solve", "spearhead",
  "standardize", "steer", "streamline", "strengthen", "structure",
  "support", "sustain", "synthesize",
  "track", "train", "transform", "translate", "troubleshoot",
  "unify", "upgrade", "utilize",
  "validate", "visualize",
];

const VERB_PATTERN = new RegExp(
  `^(${ACTION_VERBS.join("|")})\\b`,
  "i"
);

// Phrases to strip from the beginning of lines
const STRIP_PREFIXES = [
  /^you will\s+/i,
  /^you'll\s+/i,
  /^the .{0,30} will\s+/i,
  /^this role will\s+/i,
  /^responsible for\s+/i,
  /^ability to\s+/i,
  /^expected to\s+/i,
  /^required to\s+/i,
  /^help (us )?(to )?/i,
];

export interface Responsibility {
  text: string;
  category: "responsibility" | "requirement" | "qualification";
  keywords: string[]; // associated keywords found in this phrase
}

import { parseSkills } from "./parse-skills";

/**
 * Extracts action-verb-driven phrases from a job description.
 * Returns cleaned, resume-ready bullet points with associated keywords.
 */
export function parseResponsibilities(description: string): Responsibility[] {
  const lines = description
    .split(/\n/)
    .map((line) => line.trim())
    // Remove bullet markers: -, *, •, numbered lists
    .map((line) => line.replace(/^[-*•●◦▪]\s*/, ""))
    .map((line) => line.replace(/^\d+[.)]\s*/, ""))
    .filter((line) => line.length > 20 && line.length < 300);

  const results: Responsibility[] = [];
  const seen = new Set<string>();
  let currentSection: "responsibility" | "requirement" | "qualification" = "responsibility";

  for (const rawLine of lines) {
    // Detect section headers
    const lowerLine = rawLine.toLowerCase();
    if (isSection(lowerLine, ["responsibilities", "what you'll do", "what you will do", "the role", "about the role", "key duties", "in this role"])) {
      currentSection = "responsibility";
      continue;
    }
    if (isSection(lowerLine, ["requirements", "qualifications", "what we're looking for", "what you'll need", "must have", "minimum qualifications"])) {
      currentSection = "requirement";
      continue;
    }
    if (isSection(lowerLine, ["nice to have", "preferred", "bonus", "plus"])) {
      currentSection = "qualification";
      continue;
    }

    // Clean the line
    let cleaned = rawLine;
    for (const prefix of STRIP_PREFIXES) {
      cleaned = cleaned.replace(prefix, "");
    }

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    // Remove trailing periods (resume bullets typically don't have them)
    cleaned = cleaned.replace(/\.\s*$/, "");

    // Check if line starts with an action verb (after cleaning)
    if (VERB_PATTERN.test(cleaned)) {
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        // Find which keywords appear in this specific phrase
        const phraseKeywords = parseSkills(cleaned);
        results.push({ text: cleaned, category: currentSection, keywords: phraseKeywords });
      }
    }
  }

  return results;
}

function isSection(line: string, keywords: string[]): boolean {
  return keywords.some((kw) => line.includes(kw) && line.length < 80);
}
