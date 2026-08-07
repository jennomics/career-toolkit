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
      <div className="border-t border-rule pt-s-4 text-center">
        <p className="text-ink-50">No skills data yet.</p>
        <p className="text-xs text-ink-35 mt-1">
          Skills are extracted from job descriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([category, skills]) => (
        <div key={category} className="border-t border-rule pt-s-3">
          <h3 className="text-sm font-semibold text-ink mb-3">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-meta text-ink-50 text-sm font-medium border "
              >
                {skill.name}
                <span className="text-xs text-ink-35">({skill.count})</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
