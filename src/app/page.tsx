import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTaxonomy, normalizeSkillName } from "@/lib/skill-taxonomy";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Career Toolkit</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your career data at a glance
            </p>
          </div>
          <nav aria-label="Main navigation" className="flex gap-4">
            <Link
              href="/jobs"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Jobs
            </Link>
            <Link
              href="/experience"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Experience
            </Link>
            <Link
              href="/skills"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Skills
            </Link>
            <Link
              href="/resume"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Resume
            </Link>
            <Link
              href="/phrases"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Phrases
            </Link>
            <Link
              href="/companies"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Companies
            </Link>
            <Link
              href="/profile"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
            role="alert"
          >
            <strong>Database unavailable.</strong> Showing zeros. Check your database connection.
          </div>
        )}

        {/* Stats cards */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="text-lg font-semibold text-gray-900 mb-4">
            Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Jobs (Active)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeJobs}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalJobs} total saved</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Experience Roles</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalExperience}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalHighlights} highlights</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Skills Tracked</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSkills}</p>
              <p className="text-xs text-gray-400 mt-1">across jobs and experience</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Skills Normalized</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{normalizedPercent}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.normalizedSkills} of {stats.totalSkills} categorized
              </p>
            </div>
          </div>
        </section>

        {/* Feature section cards */}
        <section aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-lg font-semibold text-gray-900 mb-4">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/jobs"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                Job Library
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalJobs} jobs saved, {stats.activeJobs} active
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Save job descriptions, extract skills, track application status
              </p>
            </Link>

            <Link
              href="/experience"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                My Experience
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalExperience} roles, {stats.totalHighlights} highlights
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Manage your work history with achievements and metrics
              </p>
            </Link>

            <Link
              href="/skills"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                Skills Taxonomy
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {stats.normalizedSkills} skills mapped, {stats.unmappedSkills} unmapped
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Normalize and categorize skills across your career data
              </p>
            </Link>

            <Link
              href="/resume"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                Resume Builder
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Generate tailored resumes with AI
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Create targeted or generic resumes from your experience data
              </p>
            </Link>

            <Link
              href="/phrases"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                Resume Phrases
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalPhrases} phrases saved
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Extracted phrases grouped by keyword for resume building
              </p>
            </Link>

            <Link
              href="/dedup"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                De-duplication
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Find and merge duplicates
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Detect duplicate companies and jobs, merge them interactively
              </p>
            </Link>

            <Link
              href="/companies"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                Companies
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Company intelligence hub
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Track companies, view jobs by company, and build targeted resumes
              </p>
            </Link>

            <Link
              href="/profile"
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                Candidate Profile
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Your complete career narrative
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Positioning, stories, metrics, and resume-writer context
              </p>
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Job
            </Link>
            <Link
              href="/resume/build"
              className="inline-flex items-center px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Build Resume
            </Link>
            <Link
              href="/skills"
              className="inline-flex items-center px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              View Skills
            </Link>
            <Link
              href="/dedup"
              className="inline-flex items-center px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              De-duplication
            </Link>
          </div>
        </section>

        {/* Top Skills */}
        {stats.topSkills.length > 0 && (
          <section aria-labelledby="top-skills-heading">
            <h2 id="top-skills-heading" className="text-lg font-semibold text-gray-900 mb-4">
              Top Skills (Most Demanded)
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {stats.topSkills.map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-full border border-purple-200"
                  >
                    {skill.name}
                    <span className="text-xs text-purple-400">({skill.count})</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Based on frequency across your saved job descriptions
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
