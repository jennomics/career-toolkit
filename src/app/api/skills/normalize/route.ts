import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeSkillName, categorizeSkill, normalizeAndCategorizeWithFallback } from "@/lib/skill-taxonomy";

// POST /api/skills/normalize - Normalize skill records
// By default, only processes records where normalizedName is null (incremental).
// Pass { "force": true } in body to re-process all records.
export async function POST(request: NextRequest) {
  try {
    let force = false;
    try {
      const body = await request.json();
      force = body?.force === true;
    } catch {
      // No body or invalid JSON - use defaults (incremental mode)
    }

    // Build where clause: only unprocessed by default, all if force
    const whereClause = force ? {} : { normalizedName: null };

    // Fetch records to process
    const jobSkills = await prisma.jobSkill.findMany({ where: whereClause });
    const experienceSkills = await prisma.experienceSkill.findMany({ where: whereClause });

    let totalProcessed = 0;
    let normalized = 0;
    let categorized = 0;
    const unmapped: string[] = [];
    const unmappedSet = new Set<string>();

    // Build all update operations (each is independent and idempotent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations: any[] = [];

    // Collect skills that need LLM fallback
    const llmCandidates: { id: string; type: "job" | "experience"; normalizedName: string }[] = [];

    // Process JobSkills
    for (const skill of jobSkills) {
      totalProcessed++;
      const normalizedName = normalizeSkillName(skill.name);
      const classification = categorizeSkill(normalizedName);

      const updateData: { normalizedName: string; category?: string } = {
        normalizedName,
      };

      if (normalizedName !== skill.name) {
        normalized++;
      }

      if (classification) {
        updateData.category = `${classification.category} > ${classification.subcategory}`;
        categorized++;
      } else {
        llmCandidates.push({ id: skill.id, type: "job", normalizedName });
        if (!unmappedSet.has(normalizedName)) {
          unmappedSet.add(normalizedName);
          unmapped.push(normalizedName);
        }
      }

      operations.push(
        prisma.jobSkill.update({
          where: { id: skill.id },
          data: updateData,
        })
      );
    }

    // Process ExperienceSkills
    for (const skill of experienceSkills) {
      totalProcessed++;
      const normalizedName = normalizeSkillName(skill.name);
      const classification = categorizeSkill(normalizedName);

      const updateData: { normalizedName: string; category?: string } = {
        normalizedName,
      };

      if (normalizedName !== skill.name) {
        normalized++;
      }

      if (classification) {
        updateData.category = `${classification.category} > ${classification.subcategory}`;
        categorized++;
      } else {
        llmCandidates.push({ id: skill.id, type: "experience", normalizedName });
        if (!unmappedSet.has(normalizedName)) {
          unmappedSet.add(normalizedName);
          unmapped.push(normalizedName);
        }
      }

      operations.push(
        prisma.experienceSkill.update({
          where: { id: skill.id },
          data: updateData,
        })
      );
    }

    // Execute static taxonomy updates with limited concurrency (no transaction needed - each update is independent and idempotent)
    const CONCURRENCY = 20;
    for (let i = 0; i < operations.length; i += CONCURRENCY) {
      const batch = operations.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch);
    }

    // LLM fallback for unmapped skills (non-blocking, best-effort)
    let llmCategorized = 0;
    try {
      if (llmCandidates.length > 0) {
        // Deduplicate by normalizedName to avoid redundant LLM calls
        const uniqueNames = [...new Set(llmCandidates.map((c) => c.normalizedName))];
        const llmResults = await Promise.allSettled(
          uniqueNames.map((name) => normalizeAndCategorizeWithFallback(name))
        );

        // Build a map of normalizedName -> LLM result
        const llmMap = new Map<string, { normalizedName: string; category: string | null }>();
        uniqueNames.forEach((name, idx) => {
          const result = llmResults[idx];
          if (result.status === "fulfilled" && result.value.category) {
            llmMap.set(name, result.value);
          }
        });

        // Apply LLM results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const llmOperations: any[] = [];
        for (const candidate of llmCandidates) {
          const llmResult = llmMap.get(candidate.normalizedName);
          if (llmResult) {
            if (candidate.type === "job") {
              llmOperations.push(
                prisma.jobSkill.update({
                  where: { id: candidate.id },
                  data: {
                    normalizedName: llmResult.normalizedName,
                    category: llmResult.category,
                  },
                })
              );
            } else {
              llmOperations.push(
                prisma.experienceSkill.update({
                  where: { id: candidate.id },
                  data: {
                    normalizedName: llmResult.normalizedName,
                    category: llmResult.category,
                  },
                })
              );
            }
            llmCategorized++;
          }
        }

        // Execute LLM updates with limited concurrency (no transaction needed - each update is independent)
        for (let i = 0; i < llmOperations.length; i += CONCURRENCY) {
          const batch = llmOperations.slice(i, i + CONCURRENCY);
          await Promise.allSettled(batch);
        }

        // Remove LLM-resolved skills from unmapped list
        for (const name of llmMap.keys()) {
          unmappedSet.delete(name);
        }
      }
    } catch {
      // LLM failures never block the normalization process
    }

    return NextResponse.json({
      mode: force ? "full" : "incremental",
      totalProcessed,
      normalized,
      categorized: categorized + llmCategorized,
      llmCategorized,
      unmapped: [...unmappedSet].sort(),
    });
  } catch (err) {
    console.error("POST /api/skills/normalize error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
