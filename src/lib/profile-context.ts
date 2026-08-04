import { prisma } from "@/lib/db";

/**
 * Candidate Profile context utilities for resume and cover letter generation.
 *
 * All functions gracefully degrade: if no profile exists, callers continue
 * working without profile context. Profile injection is always ADDITIVE.
 */

// Types for the full profile with relations
type ProfileWithRelations = Awaited<ReturnType<typeof fetchProfile>>;

async function fetchProfile() {
  return prisma.candidateProfile.findFirst({
    include: {
      careerRoles: { orderBy: { sortOrder: "asc" } },
      signatureStories: true,
      profileMetrics: true,
      unresolvedItems: true,
      writingSamples: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Fetches the candidate profile with all relations.
 * Returns null if no profile exists. Errors are caught and logged
 * so callers can gracefully degrade.
 */
export async function getProfileContext() {
  try {
    const profile = await fetchProfile();
    return profile;
  } catch (err) {
    console.error("Failed to fetch candidate profile:", err);
    return null;
  }
}

/**
 * Formats the profile into a string block suitable for resume generation prompts.
 * Includes: positioning, career roles, metrics, and operating rules.
 */
export function formatProfileForResume(
  profile: NonNullable<ProfileWithRelations>
): string {
  const sections: string[] = [];

  // Positioning statements
  if (profile.positioningStatements.length > 0) {
    sections.push(
      `## CANDIDATE POSITIONING\n${profile.positioningStatements.map((s) => `- ${s}`).join("\n")}`
    );
  }

  // Career roles (richer than Experience table - have scope, full highlights, ordering)
  if (profile.careerRoles.length > 0) {
    const roles = profile.careerRoles.map((role) => {
      let block = `### ${role.title} at ${role.organization} (${role.period})`;
      if (role.scope) block += `\nScope: ${role.scope}`;
      if (role.highlights.length > 0) {
        block += `\nHighlights:\n${role.highlights.map((h) => `- ${h}`).join("\n")}`;
      }
      return block;
    });
    sections.push(`## CAREER ROLES (Strategic Narrative)\n${roles.join("\n\n")}`);
  }

  // Metrics inventory
  if (profile.profileMetrics.length > 0) {
    const metrics = profile.profileMetrics.map(
      (m) => `- ${m.label}: ${m.value}${m.source ? ` (source: ${m.source})` : ""}`
    );
    sections.push(`## QUANTIFIED ACHIEVEMENTS\n${metrics.join("\n")}`);
  }

  // Resume operating rules
  if (profile.resumeOperatingRules.length > 0) {
    sections.push(
      `## RESUME OPERATING RULES\n${profile.resumeOperatingRules.map((r) => `- ${r}`).join("\n")}`
    );
  }

  // Self-described strengths
  if (profile.selfDescribedStrengths.length > 0) {
    sections.push(
      `## SELF-DESCRIBED STRENGTHS\n${profile.selfDescribedStrengths.map((s) => `- ${s}`).join("\n")}`
    );
  }

  // Search target level and geography for context
  const targetContext: string[] = [];
  if (profile.searchTargetLevel) targetContext.push(`Target Level: ${profile.searchTargetLevel}`);
  if (profile.searchGeography) targetContext.push(`Target Geography: ${profile.searchGeography}`);
  if (targetContext.length > 0) {
    sections.push(`## SEARCH CONTEXT\n${targetContext.join("\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * Formats the profile into a string block optimized for cover letter generation.
 * Includes: positioning, relevant signature stories, voice samples, and known gaps.
 */
export function formatProfileForCoverLetter(
  profile: NonNullable<ProfileWithRelations>,
  job: { title?: string; company?: string; description?: string }
): string {
  const sections: string[] = [];

  // Positioning statements
  if (profile.positioningStatements.length > 0) {
    sections.push(
      `## CANDIDATE POSITIONING\n${profile.positioningStatements.map((s) => `- ${s}`).join("\n")}`
    );
  }

  // Signature stories - select based on relevance to job
  if (profile.signatureStories.length > 0) {
    const relevantStories = selectRelevantStories(profile.signatureStories, job);
    const stories = relevantStories.map((story) => {
      return `### ${story.title}
Situation: ${story.situation}
Obstacle: ${story.obstacle}
Action: ${story.action}
Result: ${story.result}
Why It Matters: ${story.whyItMatters}`;
    });
    sections.push(`## SIGNATURE STORIES (weave into narrative)\n${stories.join("\n\n")}`);
  }

  // Known gaps for vulnerability addressing
  if (profile.knownGaps) {
    sections.push(
      `## KNOWN GAPS (address proactively if relevant)\n${profile.knownGaps}`
    );
  }

  // Voice guidance
  const voiceGuidance = getVoiceGuidance(profile);
  if (voiceGuidance) {
    sections.push(voiceGuidance);
  }

  return sections.join("\n\n");
}

/**
 * Extracts writing style and first writing sample (first 500 chars) to guide tone.
 * Returns a formatted string or null if no voice guidance is available.
 */
export function getVoiceGuidance(
  profile: NonNullable<ProfileWithRelations>
): string | null {
  console.warn('DEPRECATED: getVoiceGuidance is deprecated. Use topic-based passage retrieval from src/lib/voice/retrieval.ts instead.');
  const parts: string[] = [];

  if (profile.writingStyle) {
    parts.push(`Writing Style: ${profile.writingStyle}`);
  }

  if (profile.selfDescribedPosture) {
    parts.push(`Communication Posture: ${profile.selfDescribedPosture}`);
  }

  if (profile.writingSamples.length > 0) {
    const sample = profile.writingSamples[0];
    const truncated = sample.content.slice(0, 500);
    const suffix = sample.content.length > 500 ? "..." : "";
    parts.push(
      `Writing Sample ("${sample.title}"${sample.context ? `, context: ${sample.context}` : ""}):\n${truncated}${suffix}`
    );
  }

  if (parts.length === 0) return null;
  return `## VOICE GUIDANCE\n${parts.join("\n\n")}`;
}

/**
 * Checks whether generation is ready by counting unresolved items.
 * Returns { ready, unresolvedCount }.
 */
export async function checkGenerationReady(): Promise<{
  ready: boolean;
  unresolvedCount: number;
}> {
  try {
    const profile = await prisma.candidateProfile.findFirst({
      include: {
        unresolvedItems: {
          where: { resolvedAt: null },
        },
      },
    });

    if (!profile) {
      // No profile means no unresolved items to block on
      return { ready: true, unresolvedCount: 0 };
    }

    const unresolvedCount = profile.unresolvedItems.length;
    return { ready: unresolvedCount === 0, unresolvedCount };
  } catch (err) {
    console.error("Failed to check generation readiness:", err);
    // Do not block generation on profile fetch errors
    return { ready: true, unresolvedCount: 0 };
  }
}

/**
 * Select signature stories most relevant to a target job.
 * Uses keyword matching against job title, company, and description.
 * Returns up to 3 most relevant stories.
 */
function selectRelevantStories(
  stories: NonNullable<ProfileWithRelations>["signatureStories"],
  job: { title?: string; company?: string; description?: string }
): typeof stories {
  if (stories.length <= 3) return stories;

  // Build a set of keywords from the job
  const jobText = [job.title || "", job.company || "", job.description || ""]
    .join(" ")
    .toLowerCase();

  // Score each story by how many of its words appear in the job context
  const scored = stories.map((story) => {
    const storyText = [
      story.title,
      story.situation,
      story.action,
      story.result,
      story.whyItMatters,
    ]
      .join(" ")
      .toLowerCase();

    // Extract meaningful words (5+ chars) from the story
    const words = storyText.match(/\b\w{5,}\b/g) || [];
    const matchCount = words.filter((w) => jobText.includes(w)).length;

    return { story, score: matchCount };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.story);
}
