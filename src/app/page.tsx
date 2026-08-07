import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTaxonomy, normalizeSkillName } from "@/lib/skill-taxonomy";
import Nav from "@/components/Nav";
import DashboardTrackerCard from "@/components/tracker/DashboardTrackerCard";

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalExperience: number;
  totalHighlights: number;
  totalSkills: number;
  normalizedSkills: number;
  totalPhrases: number;
  unmappedSkills: number;
  topSkills: { name: string; count: number }[];
}

async function fetchStats(): Promise<{ stats: DashboardStats; error: boolean }> {
  try {
    const [
      totalJobs,
      activeJobs,
      totalExperience,
      totalHighlights,
      totalJobSkills,
      normalizedJobSkills,
      totalExperienceSkills,
      normalizedExperienceSkills,
      totalPhrases,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: { notIn: ["rejected", "closed"] } } }),
      prisma.experience.count(),
      prisma.experienceHighlight.count(),
      prisma.jobSkill.count(),
      prisma.jobSkill.count({ where: { normalizedName: { not: null } } }),
      prisma.experienceSkill.count(),
      prisma.experienceSkill.count({ where: { normalizedName: { not: null } } }),
      prisma.jobResponsibility.count(),
    ]);

    const totalSkills = totalJobSkills + totalExperienceSkills;
    const normalizedSkills = normalizedJobSkills + normalizedExperienceSkills;

    // Calculate unmapped skills the same way as the taxonomy page:
    // skills whose normalized name is NOT a canonical name in the static taxonomy
    const taxonomy = getTaxonomy();
    const allCanonical = new Set<string>();
    for (const cat of taxonomy.categories) {
      for (const sub of cat.subcategories) {
        for (const skill of sub.skills) {
          allCanonical.add(skill.canonicalName);
        }
      }
    }

    // Fetch all job skills to check which are actually mapped to taxonomy
    const allJobSkills = await prisma.jobSkill.findMany({ select: { name: true, normalizedName: true } });
    const allExpSkills = await prisma.experienceSkill.findMany({ select: { name: true, normalizedName: true } });

    const unmappedNames = new Set<string>();
    for (const skill of allJobSkills) {
      const normalized = skill.normalizedName || normalizeSkillName(skill.name);
      if (!allCanonical.has(normalized)) {
        unmappedNames.add(normalized);
      }
    }
    for (const skill of allExpSkills) {
      const normalized = skill.normalizedName || normalizeSkillName(skill.name);
      if (!allCanonical.has(normalized)) {
        unmappedNames.add(normalized);
      }
    }
    const unmappedSkills = unmappedNames.size;

    // Get top 10 most-demanded skills by job count
    const topSkillsRaw = await prisma.jobSkill.groupBy({
      by: ["name"],
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
      take: 10,
    });

    const topSkills = topSkillsRaw.map((s) => ({
      name: s.name,
      count: s._count.name,
    }));

    return {
      stats: {
        totalJobs,
        activeJobs,
        totalExperience,
        totalHighlights,
        totalSkills,
        normalizedSkills,
        totalPhrases,
        unmappedSkills,
        topSkills,
      },
      error: false,
    };
  } catch {
    return {
      stats: {
        totalJobs: 0,
        activeJobs: 0,
        totalExperience: 0,
        totalHighlights: 0,
        totalSkills: 0,
        normalizedSkills: 0,
        totalPhrases: 0,
        unmappedSkills: 0,
        topSkills: [],
      },
      error: true,
    };
  }
}

export default async function DashboardPage() {
  const { stats, error } = await fetchStats();

  const normalizedPercent =
    stats.totalSkills > 0
      ? Math.round((stats.normalizedSkills / stats.totalSkills) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Career Toolkit" subtitle="Your career data at a glance" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-5">
        {/* Error banner */}
        {error && (
          <div
            className="border border-rule p-s-3 text-ink text-body"
            role="alert"
          >
            Database unavailable. Showing zeros. Check your database connection.
          </div>
        )}

        {/* Stats section */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="text-h3 font-zen font-medium text-ink border-t border-rule pt-s-3 mb-s-3">
            Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-s-3">
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Total jobs (active)</p>
              <p className="font-mono text-h2 text-ink mt-1">{stats.activeJobs}</p>
              <p className="font-mono text-meta text-ink-35 mt-1">{stats.totalJobs} total saved</p>
            </div>
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Experience roles</p>
              <p className="font-mono text-h2 text-ink mt-1">{stats.totalExperience}</p>
              <p className="font-mono text-meta text-ink-35 mt-1">{stats.totalHighlights} highlights</p>
            </div>
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Skills tracked</p>
              <p className="font-mono text-h2 text-ink mt-1">{stats.totalSkills}</p>
              <p className="font-mono text-meta text-ink-35 mt-1">across jobs and experience</p>
            </div>
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Skills normalized</p>
              <p className="font-mono text-h2 text-ink mt-1">{normalizedPercent}%</p>
              <p className="font-mono text-meta text-ink-35 mt-1">
                {stats.normalizedSkills} of {stats.totalSkills} categorized
              </p>
            </div>
          </div>
        </section>

        {/* Pipeline Tracker Stats */}
        <section aria-labelledby="tracker-heading">
          <h2 id="tracker-heading" className="text-h3 font-zen font-medium text-ink border-t border-rule pt-s-3 mb-s-3">
            Application pipeline
          </h2>
          <div className="border-t border-rule pt-s-3">
            <DashboardTrackerCard />
          </div>
        </section>

        {/* Feature section - ruled list */}
        <section aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-h3 font-zen font-medium text-ink border-t border-rule pt-s-3 mb-s-3">
            Features
          </h2>
          <div className="divide-y divide-rule border-t border-rule">
            <Link
              href="/tracker"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Application tracker
              </h3>
              <p className="text-body text-ink-72 mt-1">
                Pipeline board, analytics, and attention items
              </p>
            </Link>

            <Link
              href="/jobs"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Job library
              </h3>
              <p className="text-body text-ink-72 mt-1">
                <span className="font-mono">{stats.totalJobs}</span> jobs saved, <span className="font-mono">{stats.activeJobs}</span> active
              </p>
            </Link>

            <Link
              href="/experience"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                My experience
              </h3>
              <p className="text-body text-ink-72 mt-1">
                <span className="font-mono">{stats.totalExperience}</span> roles, <span className="font-mono">{stats.totalHighlights}</span> highlights
              </p>
            </Link>

            <Link
              href="/skills"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Skills taxonomy
              </h3>
              <p className="text-body text-ink-72 mt-1">
                <span className="font-mono">{stats.normalizedSkills}</span> skills mapped, <span className="font-mono">{stats.unmappedSkills}</span> unmapped
              </p>
            </Link>

            <Link
              href="/resume"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Resume builder
              </h3>
              <p className="text-body text-ink-72 mt-1">
                Generate tailored resumes with AI
              </p>
            </Link>

            <Link
              href="/phrases"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Resume phrases
              </h3>
              <p className="text-body text-ink-72 mt-1">
                <span className="font-mono">{stats.totalPhrases}</span> phrases saved
              </p>
            </Link>

            <Link
              href="/dedup"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                De-duplication
              </h3>
              <p className="text-body text-ink-72 mt-1">
                Find and merge duplicates
              </p>
            </Link>

            <Link
              href="/companies"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Companies
              </h3>
              <p className="text-body text-ink-72 mt-1">
                Company intelligence hub
              </p>
            </Link>

            <Link
              href="/profile"
              className="block py-s-3 cursor-pointer"
            >
              <h3 className="text-body font-zen font-medium text-ink">
                Candidate profile
              </h3>
              <p className="text-body text-ink-72 mt-1">
                Your complete career narrative
              </p>
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="text-h3 font-zen font-medium text-ink border-t border-rule pt-s-3 mb-s-3">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-s-2">
            <Link
              href="/jobs"
              className="inline-flex items-center px-s-3 border-[1.5px] border-live text-live text-body font-medium h-[48px] cursor-pointer"
            >
              Add job
            </Link>
            <Link
              href="/resume"
              className="inline-flex items-center px-s-3 border-[1.5px] border-live text-live text-body font-medium h-[48px] cursor-pointer"
            >
              Build resume
            </Link>
            <Link
              href="/skills"
              className="inline-flex items-center px-s-3 border border-ink text-ink text-body font-medium h-[48px] cursor-pointer"
            >
              View skills
            </Link>
            <Link
              href="/dedup"
              className="inline-flex items-center px-s-3 border border-ink text-ink text-body font-medium h-[48px] cursor-pointer"
            >
              De-duplication
            </Link>
          </div>
        </section>

        {/* Top Skills */}
        {stats.topSkills.length > 0 && (
          <section aria-labelledby="top-skills-heading">
            <h2 id="top-skills-heading" className="text-h3 font-zen font-medium text-ink border-t border-rule pt-s-3 mb-s-3">
              Top skills (most demanded)
            </h2>
            <div className="divide-y divide-rule border-t border-rule">
              {stats.topSkills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between py-s-2"
                >
                  <span className="text-body text-ink">{skill.name}</span>
                  <span className="font-mono text-meta text-ink-50">{skill.count}</span>
                </div>
              ))}
            </div>
            <p className="font-mono text-meta text-ink-35 mt-s-2">
              Based on frequency across your saved job descriptions
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
