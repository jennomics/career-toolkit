import { parseSkills } from "./parse-skills";
import { prisma } from "./db";

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  skills: string[];
}

interface Correction {
  field: string;
  extractedValue: string;
  correctedValue: string;
  rawContext: string;
  source: string | null;
}

/**
 * Attempts to extract structured job info from a raw pasted job description.
 * Uses heuristics first, then checks past corrections to improve results.
 */
export async function parseJob(rawText: string): Promise<ParsedJob> {
  const lines = rawText.trim().split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "";
  let company = "";
  let location = "";

  if (lines.length >= 1) {
    title = extractTitle(lines);
  }
  if (lines.length >= 2) {
    company = extractCompany(lines);
  }
  location = extractLocation(lines.slice(0, 8).join(" "));

  // Learn from past corrections
  const corrections = await getRecentCorrections();
  title = applyCorrections(title, rawText, "title", corrections);
  company = applyCorrections(company, rawText, "company", corrections);
  location = applyCorrections(location, rawText, "location", corrections);

  const skills = parseSkills(rawText);

  return { title, company, location, skills };
}

/**
 * Fetch recent corrections to use as learning data.
 */
async function getRecentCorrections(): Promise<Correction[]> {
  try {
    const corrections = await prisma.correction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return corrections;
  } catch {
    // If DB isn't ready or errors, just skip corrections
    return [];
  }
}

/**
 * Apply learned corrections to improve extraction.
 * 
 * Strategy:
 * - If we extracted the same wrong value before and the user corrected it,
 *   use the corrected value instead.
 * - If the raw text shares significant overlap with a previous correction's
 *   context (same company posting style, etc.), prefer the corrected pattern.
 */
function applyCorrections(
  extractedValue: string,
  rawText: string,
  field: string,
  corrections: Correction[]
): string {
  const fieldCorrections = corrections.filter((c) => c.field === field);
  if (fieldCorrections.length === 0) return extractedValue;

  // Exact match: we extracted the same wrong value before
  const exactMatch = fieldCorrections.find(
    (c) => c.extractedValue === extractedValue && c.extractedValue !== c.correctedValue
  );
  if (exactMatch) {
    return exactMatch.correctedValue;
  }

  // Context similarity: if the first few lines look like a previous correction's context,
  // and our current extraction is empty or matches the old wrong extraction, use the pattern.
  const rawContext = rawText.slice(0, 500);
  for (const correction of fieldCorrections) {
    if (!correction.rawContext) continue;
    const similarity = contextSimilarity(rawContext, correction.rawContext);
    // If the contexts are very similar (same company, same format)
    // and we extracted the same wrong value (or nothing), apply the correction pattern
    if (similarity > 0.6 && (extractedValue === correction.extractedValue || extractedValue === "")) {
      return correction.correctedValue;
    }
  }

  return extractedValue;
}

/**
 * Simple similarity score between two text contexts.
 * Uses shared word overlap (Jaccard-like) on the first few lines.
 */
function contextSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

function extractTitle(lines: string[]): string {
  for (const line of lines.slice(0, 3)) {
    if (line.startsWith("http") || line.length < 5) continue;
    if ((line.match(/·/g) || []).length >= 2) continue;
    if (/^(posted|apply|save|share|report)/i.test(line)) continue;
    return line;
  }
  return lines[0] || "";
}

function extractCompany(lines: string[]): string {
  for (const line of lines.slice(0, 5)) {
    if (line.includes("·")) {
      const parts = line.split("·").map((p) => p.trim());
      if (parts[0] && parts[0].length > 1 && parts[0].length < 80) {
        return parts[0];
      }
    }
  }

  for (const line of lines.slice(0, 4)) {
    const atMatch = line.match(/(?:at|@)\s+(.+?)(?:\s*[-·|]|$)/i);
    if (atMatch) return atMatch[1].trim();
  }

  if (lines[1] && lines[1].length < 60 && !lines[1].includes(":")) {
    return lines[1];
  }

  return "";
}

function extractLocation(text: string): string {
  if (/\bremote\b/i.test(text)) {
    const remoteMatch = text.match(/\b((?:hybrid\s+)?remote(?:\s*[-–]\s*[A-Z][a-zA-Z\s,]+)?)/i);
    if (remoteMatch) return remoteMatch[1].trim();
    return "Remote";
  }

  const cityStateMatch = text.match(
    /\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)\b/
  );
  if (cityStateMatch) return cityStateMatch[1].trim();

  const cityCountryMatch = text.match(
    /\b([A-Z][a-zA-Z\s]+,\s*(?:UK|USA|US|Canada|Australia|Germany|France|India|Singapore|Ireland))\b/i
  );
  if (cityCountryMatch) return cityCountryMatch[1].trim();

  return "";
}
