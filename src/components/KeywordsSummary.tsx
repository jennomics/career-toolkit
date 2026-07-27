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
      // Check if this job has the selected keyword
      const hasKeyword = job.skills.some((s) => s.name === selectedKeyword);
      if (hasKeyword && job.responsibilities) {
        // Find responsibilities that contain the keyword (case-insensitive)
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
        // If no phrase directly mentions the keyword, include all from that job
        // (the keyword was found in the overall description)
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
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900 mb-1">Top Keywords Across Your Saved Jobs</h2>
      <p className="text-sm text-gray-500 mb-4">
        Click a keyword to see associated resume-ready phrases.
      </p>
      <div className="space-y-2">
        {sortedKeywords.map(([keyword, count]) => (
          <button
            key={keyword}
            onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
            className={`flex items-center gap-3 w-full text-left rounded-md px-2 py-1 -mx-2 transition-colors cursor-pointer ${
              selectedKeyword === keyword
                ? "bg-blue-50"
                : "hover:bg-gray-50"
            }`}
          >
            <span className={`text-sm w-40 truncate ${
              selectedKeyword === keyword ? "text-blue-700 font-medium" : "text-gray-700"
            }`}>
              {keyword}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  selectedKeyword === keyword ? "bg-blue-600" : "bg-blue-500"
                }`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-16 text-right">
              {count} job{count !== 1 ? "s" : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Associated phrases panel */}
      {selectedKeyword && associatedPhrases.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Phrases associated with &ldquo;{selectedKeyword}&rdquo;
          </h3>
          <ul className="space-y-2">
            {associatedPhrases.map((phrase, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                  phrase.category === "responsibility"
                    ? "bg-green-100 text-green-700"
                    : phrase.category === "requirement"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {phrase.category === "responsibility" ? "DO" : phrase.category === "requirement" ? "NEED" : "NICE"}
                </span>
                <div>
                  <p className="text-gray-800">{phrase.text}</p>
                  <p className="text-xs text-gray-400">{phrase.jobTitle} at {phrase.company}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedKeyword && associatedPhrases.length === 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            No resume phrases found for &ldquo;{selectedKeyword}&rdquo; yet.
          </p>
        </div>
      )}
    </div>
  );
}
