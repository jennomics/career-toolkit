"use client";

interface Job {
  skills: { id: string; name: string }[];
}

interface SkillsSummaryProps {
  jobs: Job[];
}

export default function SkillsSummary({ jobs }: SkillsSummaryProps) {
  // Count skill frequency across all jobs
  const skillCounts = new Map<string, number>();
  for (const job of jobs) {
    for (const skill of job.skills) {
      skillCounts.set(skill.name, (skillCounts.get(skill.name) || 0) + 1);
    }
  }

  // Sort by frequency
  const sortedSkills = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sortedSkills.length === 0) {
    return null;
  }

  const maxCount = sortedSkills[0][1];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-1">Top Skills Across Your Saved Jobs</h2>
      <p className="text-sm text-gray-500 mb-4">
        These skills appear most frequently in your saved job descriptions.
        Use them to prioritize what to highlight on your resume.
      </p>
      <div className="space-y-2">
        {sortedSkills.map(([skill, count]) => (
          <div key={skill} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-40 truncate">{skill}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-16 text-right">
              {count} job{count !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
