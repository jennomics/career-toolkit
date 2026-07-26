import { parseSkills } from "./parse-skills";

export interface ParsedJob {
  title: string;
  company: string;
  location: string;
  skills: string[];
}

/**
 * Attempts to extract structured job info from a raw pasted job description.
 * 
 * LinkedIn and most job boards follow a common pattern:
 * - First few lines contain the title, company, and location
 * - The rest is the full description
 * 
 * This is heuristic-based and won't be perfect, but it gives a solid starting point
 * that the user can edit.
 */
export function parseJob(rawText: string): ParsedJob {
  const lines = rawText.trim().split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "";
  let company = "";
  let location = "";

  // Strategy: the first non-empty line is usually the job title
  // The second line is often the company name
  // Location often appears in the first few lines, containing city/state patterns or "Remote"
  
  if (lines.length >= 1) {
    title = extractTitle(lines);
  }
  if (lines.length >= 2) {
    company = extractCompany(lines);
  }
  location = extractLocation(lines.slice(0, 8).join(" "));

  const skills = parseSkills(rawText);

  return { title, company, location, skills };
}

function extractTitle(lines: string[]): string {
  // Title is typically the first line, often the longest "heading-like" line
  // in the first 3 lines. Skip lines that look like breadcrumbs or metadata.
  for (const line of lines.slice(0, 3)) {
    // Skip lines that are just links, dates, or very short metadata
    if (line.startsWith("http") || line.length < 5) continue;
    // Skip lines that look like "Company · Location · Posted date"
    if ((line.match(/·/g) || []).length >= 2) continue;
    // Skip lines that start with common metadata prefixes
    if (/^(posted|apply|save|share|report)/i.test(line)) continue;
    return line;
  }
  return lines[0] || "";
}

function extractCompany(lines: string[]): string {
  // Company is often the second line, or part of a "Company · Location" pattern
  for (const line of lines.slice(0, 5)) {
    // LinkedIn pattern: "Company Name · City, State · Posted X ago"
    if (line.includes("·")) {
      const parts = line.split("·").map((p) => p.trim());
      if (parts[0] && parts[0].length > 1 && parts[0].length < 80) {
        return parts[0];
      }
    }
  }
  
  // Try "at Company" or "- Company" pattern in first few lines
  for (const line of lines.slice(0, 4)) {
    const atMatch = line.match(/(?:at|@)\s+(.+?)(?:\s*[-·|]|$)/i);
    if (atMatch) return atMatch[1].trim();
  }

  // Fall back to second line if it's short enough to be a company name
  if (lines[1] && lines[1].length < 60 && !lines[1].includes(":")) {
    return lines[1];
  }

  return "";
}

function extractLocation(text: string): string {
  // Look for "Remote" mentions
  if (/\bremote\b/i.test(text)) {
    // Check for "Hybrid Remote" or "Remote - City"
    const remoteMatch = text.match(/\b((?:hybrid\s+)?remote(?:\s*[-–]\s*[A-Z][a-zA-Z\s,]+)?)/i);
    if (remoteMatch) return remoteMatch[1].trim();
    return "Remote";
  }

  // Match "City, State" or "City, State, Country" patterns
  const cityStateMatch = text.match(
    /\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)\b/
  );
  if (cityStateMatch) return cityStateMatch[1].trim();

  // Match "City, Country" (e.g., "London, UK" or "Toronto, Canada")
  const cityCountryMatch = text.match(
    /\b([A-Z][a-zA-Z\s]+,\s*(?:UK|USA|US|Canada|Australia|Germany|France|India|Singapore|Ireland))\b/i
  );
  if (cityCountryMatch) return cityCountryMatch[1].trim();

  return "";
}
