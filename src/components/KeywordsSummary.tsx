"use client";

import { useState } from "react";

interface Responsibility {
  id: string;
  text: string;
  category: string;
}

interface Job {
  skills: { id: string; name: string }[];
  responsibilities: Responsibility[];
  title: string;
  company: string;
}

interface KeywordsSummaryProps {
  jobs: Job[];
}

export default function KeywordsSummary({ jobs }: KeywordsSummaryProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // Count keyword frequency across all jobs
  const keywordCounts = new Map<string, number>();
  for (const job of jobs) {
    for (const skill of job.skills) {
      keywordCounts.set(skill.name, (keywordCounts.get(skill.name) || 0) + 1);
    }
  }

  // Sort by frequency
  const sortedKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sortedKeywords.length === 0) {
    return null;
  }

  const maxCount = sortedKeywords[0][1];

  // Find all phrases associated with the selected keyword
  const associatedPhrases: { text: string; category: string; jobTitle: string; company: string }[] = [];
  if (selectedKeyword) {
    for (const job of jobs) {
      const hasKeyword = job.skills.some((s) => s.name === selectedKeyword);
      if (hasKeyword && job.responsibilities) {
        const keywordLower = selectedKeyword.toLowerCase();
        for (const r of job.responsibilities) {
          if (r.text.toLowerCase().includes(keywordLower)) {
            associatedPhrases.push({
              text: r.text,
              category: r.category,
              jobTitle: job.title,
              company: job.company,
            });
          }
        }
        if (associatedPhrases.length === 0) {
          for (const r of job.responsibilities) {
            associatedPhrases.push({
              text: r.text,
              category: r.category,
              jobTitle: job.title,
              company: job.company,
            });
          }
        }
      }
    }
  }

  return (
    <div className="border-t border-rule pt-s-3">
      <h2 className="text-h3 font-medium text-ink mb-s-1">Top keywords across your saved jobs</h2>
      <p className="text-body text-ink-72 mb-s-3">
        Click a keyword to see associated resume-ready phrases.
      </p>
      <div className="space-y-s-1">
        {sortedKeywords.map(([keyword, count]) => (
          <button
            key={keyword}
            onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
            className={`flex items-center gap-s-2 w-full text-left py-s-1 cursor-pointer transition-colors ${
              selectedKeyword === keyword
                ? "border-l-2 border-ink pl-s-2"
                : "pl-s-2"
            }`}
          >
            <span className={`font-mono text-body w-40 truncate ${
              selectedKeyword === keyword ? "text-ink font-medium" : "text-ink-72"
            }`}>
              {keyword}
            </span>
            <div className="flex-1 bg-rule h-[2px] overflow-hidden">
              <div
                className="h-full bg-ink transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="font-mono text-meta text-ink-50 w-16 text-right">
              {count} job{count !== 1 ? "s" : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Associated phrases panel */}
      {selectedKeyword && associatedPhrases.length > 0 && (
        <div className="mt-s-3 pt-s-2 border-t border-rule">
          <h3 className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Phrases associated with &ldquo;{selectedKeyword}&rdquo;
          </h3>
          <ul className="space-y-s-1">
            {associatedPhrases.map((phrase, i) => (
              <li key={i} className="flex items-start gap-s-1 text-body">
                <span className="font-mono text-meta uppercase text-ink-50 shrink-0 mt-0.5">
                  {phrase.category === "responsibility" ? "DO" : phrase.category === "requirement" ? "NEED" : "NICE"}
                </span>
                <div>
                  <p className="text-ink-72">{phrase.text}</p>
                  <p className="font-mono text-meta text-ink-50">{phrase.jobTitle} at {phrase.company}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedKeyword && associatedPhrases.length === 0 && (
        <div className="mt-s-3 pt-s-2 border-t border-rule">
          <p className="text-body text-ink-50">
            No resume phrases found for &ldquo;{selectedKeyword}&rdquo; yet.
          </p>
        </div>
      )}
    </div>
  );
}
