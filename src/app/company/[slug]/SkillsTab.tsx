"use client";

import { useMemo } from "react";
import { SkillBreakdown } from "./page";

interface SkillsTabProps {
  skillsBreakdown: SkillBreakdown[];
}

export default function SkillsTab({ skillsBreakdown }: SkillsTabProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, SkillBreakdown[]>();
    for (const skill of skillsBreakdown) {
      const cat = skill.category || "Uncategorized";
      const existing = groups.get(cat) || [];
      existing.push(skill);
      groups.set(cat, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const aTotal = a[1].reduce((sum, s) => sum + s.count, 0);
      const bTotal = b[1].reduce((sum, s) => sum + s.count, 0);
      return bTotal - aTotal;
    });
  }, [skillsBreakdown]);

  if (skillsBreakdown.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No skills data yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Skills are extracted from job descriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([category, skills]) => (
        <div key={category} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-full border border-purple-200"
              >
                {skill.name}
                <span className="text-xs text-purple-400">({skill.count})</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
