"use client";

import { useMemo } from "react";
import { CompanyJob } from "./page";

interface PhrasesTabProps {
  jobs: CompanyJob[];
}

interface Phrase {
  id: string;
  text: string;
  category: string;
  keywords: string[];
  jobTitle: string;
}

export default function PhrasesTab({ jobs }: PhrasesTabProps) {
  const grouped = useMemo(() => {
    const phrases: Phrase[] = [];
    for (const job of jobs) {
      for (const resp of job.responsibilities) {
        phrases.push({
          id: resp.id,
          text: resp.text,
          category: resp.category,
          keywords: resp.keywords || [],
          jobTitle: job.title,
        });
      }
    }

    const groups = new Map<string, Phrase[]>();
    for (const phrase of phrases) {
      const cat = phrase.category || "other";
      const existing = groups.get(cat) || [];
      existing.push(phrase);
      groups.set(cat, existing);
    }

    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [jobs]);

  const totalPhrases = grouped.reduce((sum, [, phrases]) => sum + phrases.length, 0);

  if (totalPhrases === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No phrases extracted yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          Phrases are extracted from job descriptions when jobs are added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([category, phrases]) => (
        <div key={category} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 capitalize">
            {category} <span className="text-gray-400 font-normal">({phrases.length})</span>
          </h3>
          <div className="space-y-3">
            {phrases.map((phrase) => (
              <div key={phrase.id} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm text-gray-700">{phrase.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">from: {phrase.jobTitle}</span>
                  {phrase.keywords.length > 0 && (
                    <div className="flex gap-1">
                      {phrase.keywords.slice(0, 5).map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
