import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTaxonomy, normalizeSkillName } from "@/lib/skill-taxonomy";
import { withHandler } from "@/lib/with-handler";

// GET /api/skills/taxonomy - Returns full taxonomy tree with counts
export const GET = withHandler(async (_request: NextRequest) => {
  // Fetch all skills to compute counts
  const jobSkills = await prisma.jobSkill.findMany({
    select: { name: true, normalizedName: true },
  });
  const experienceSkills = await prisma.experienceSkill.findMany({
    select: { name: true, normalizedName: true },
  });

  // Build count maps using normalized names
  const jobCountMap = new Map<string, number>();
  const expCountMap = new Map<string, number>();

  for (const skill of jobSkills) {
    const normalized = skill.normalizedName || normalizeSkillName(skill.name);
    jobCountMap.set(normalized, (jobCountMap.get(normalized) || 0) + 1);
  }

  for (const skill of experienceSkills) {
    const normalized = skill.normalizedName || normalizeSkillName(skill.name);
    expCountMap.set(normalized, (expCountMap.get(normalized) || 0) + 1);
  }

  // Build the taxonomy response with counts
  const taxonomy = getTaxonomy();
  const categories = taxonomy.categories.map((category) => ({
    name: category.name,
    type: category.type,
    subcategories: category.subcategories.map((subcategory) => ({
      name: subcategory.name,
      skills: subcategory.skills.map((skill) => ({
        canonicalName: skill.canonicalName,
        jobCount: jobCountMap.get(skill.canonicalName) || 0,
        experienceCount: expCountMap.get(skill.canonicalName) || 0,
        aliases: skill.aliases,
      })),
    })),
  }));

  // Find unmapped skills (skills that don't appear in the taxonomy)
  const allCanonical = new Set<string>();
  for (const cat of taxonomy.categories) {
    for (const sub of cat.subcategories) {
      for (const skill of sub.skills) {
        allCanonical.add(skill.canonicalName);
      }
    }
  }

  const unmappedSkills: { name: string; jobCount: number; experienceCount: number }[] = [];
  const seenUnmapped = new Set<string>();

  for (const [name, count] of jobCountMap) {
    if (!allCanonical.has(name) && !seenUnmapped.has(name)) {
      seenUnmapped.add(name);
      unmappedSkills.push({
        name,
        jobCount: count,
        experienceCount: expCountMap.get(name) || 0,
      });
    }
  }

  for (const [name, count] of expCountMap) {
    if (!allCanonical.has(name) && !seenUnmapped.has(name)) {
      seenUnmapped.add(name);
      unmappedSkills.push({
        name,
        jobCount: jobCountMap.get(name) || 0,
        experienceCount: count,
      });
    }
  }

  unmappedSkills.sort((a, b) => (b.jobCount + b.experienceCount) - (a.jobCount + a.experienceCount));

  return NextResponse.json({
    categories,
    unmapped: unmappedSkills,
    stats: {
      totalJobSkills: jobSkills.length,
      totalExperienceSkills: experienceSkills.length,
      taxonomySkillCount: allCanonical.size,
    },
  });
});
