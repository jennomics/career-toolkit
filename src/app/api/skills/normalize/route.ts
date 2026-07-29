import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeSkillName, categorizeSkill } from "@/lib/skill-taxonomy";

// POST /api/skills/normalize - Normalize all existing skill records
export async function POST() {
  try {
    // Fetch all JobSkill records
    const jobSkills = await prisma.jobSkill.findMany();
    // Fetch all ExperienceSkill records
    const experienceSkills = await prisma.experienceSkill.findMany();

    let totalProcessed = 0;
    let normalized = 0;
    let categorized = 0;
    const unmapped: string[] = [];
    const unmappedSet = new Set<string>();

    // Build all update operations for atomicity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations: any[] = [];

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

    // Execute updates in batches of 500 to avoid Prisma's parameter limit
    const BATCH_SIZE = 500;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(batch);
    }

    return NextResponse.json({
      totalProcessed,
      normalized,
      categorized,
      unmapped: unmapped.sort(),
    });
  } catch (err) {
    console.error("POST /api/skills/normalize error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
