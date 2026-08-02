import { NextRequest, NextResponse } from "next/server";
import {
  getProfileContext,
  formatProfileForCoverLetter,
} from "@/lib/profile-context";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";
import { guardedLLMCall } from "@/lib/guarded-llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/resume/project/[id]/cover-letter
 *
 * Uses GPT-4o to generate a half-page cover letter.
 * Body: { jobTitle, company, jobDescription, resumeDraft }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobTitle, company, jobDescription, resumeDraft } = body;

    if (!jobTitle || !company) {
      return validationError("jobTitle and company are required");
    }

    // Fetch candidate profile for cover letter context
    let profileCoverLetterContext = "";
    let voiceSystemAddition = "";
    let writingSampleReference = "";

    try {
      const profile = await getProfileContext();
      if (profile) {
        profileCoverLetterContext = formatProfileForCoverLetter(profile, {
          title: jobTitle,
          company,
          description: jobDescription,
        });

        // Extract voice guidance for system prompt
        if (profile.writingStyle) {
          voiceSystemAddition = `\n\nVOICE GUIDANCE: ${profile.writingStyle}`;
          if (profile.selfDescribedPosture) {
            voiceSystemAddition += `\nCommunication Posture: ${profile.selfDescribedPosture}`;
          }
        }

        // Add writing sample as tone reference
        if (profile.writingSamples.length > 0) {
          const sample = profile.writingSamples[0];
          const truncated = sample.content.slice(0, 500);
          const suffix = sample.content.length > 500 ? "..." : "";
          writingSampleReference = `\n\nWrite in this voice. Here is an example of how this person writes cover letters:\n${truncated}${suffix}`;
        }
      }
    } catch (err) {
      console.error("Profile fetch error in cover-letter (non-blocking):", err);
    }

    const systemContent = `You are an elite executive cover letter strategist ($500+ level). Write a compelling half-page cover letter (exactly 250-300 words) that reads as a strategic pitch, not a form letter.

Your cover letter philosophy:
- Opening: Lead with a powerful value proposition that immediately signals why you are THE candidate. Never open with "I am writing to apply for..." or any generic opener. Start with impact.
- Body: Weave 2-3 carefully selected achievements into a narrative that directly addresses the company's strategic priorities. Each achievement should demonstrate how you have already solved the problems this role exists to solve.
- Career narrative: Connect your trajectory to this role as the logical next step, showing increasing strategic impact that culminates in this opportunity.
- Closing: End with confident forward momentum, not desperation. Express what you will bring, not what you hope to gain. Include a clear call to action.

Critical rules:
- EXACTLY 250-300 words. This is a half-page letter. Do not exceed 300 words.
- Never repeat resume content verbatim. The cover letter COMPLEMENTS the resume by providing context and narrative.
- Reference specific details from the job description to demonstrate genuine engagement with the opportunity.
- Tone: authoritative, warm, and strategically confident. You are a peer exploring mutual fit, not a supplicant.
- Use the company name and role title naturally in the text.
- No cliches: "passionate about," "team player," "fast-paced environment," "excited to apply" are banned.

Return the cover letter as plain text (no JSON wrapping). Start with "Dear Hiring Manager," and end with a professional sign-off.${voiceSystemAddition}${writingSampleReference}`;

    let userContent = `Target role: ${jobTitle} at ${company}

Job Description (key parts):
${jobDescription?.slice(0, 2000) || "Not provided"}

My resume highlights:
${resumeDraft?.slice(0, 3000) || "Not provided"}`;

    if (profileCoverLetterContext) {
      userContent += `\n\n---\n\nCANDIDATE PROFILE CONTEXT:\n${profileCoverLetterContext}`;
    }

    userContent += `\n\nWrite a half-page cover letter for this role.`;

    const coverLetter = await guardedLLMCall({
      model: "gpt-4o",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      jsonMode: false,
    });

    return NextResponse.json({ coverLetter });
  } catch (err) {
    console.error("POST cover-letter error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
