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
      <div className="border-t border-rule pt-s-4 text-center">
        <p className="text-ink-50">No phrases extracted yet.</p>
        <p className="text-xs text-ink-35 mt-1">
          Phrases are extracted from job descriptions when jobs are added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([category, phrases]) => (
        <div key={category} className="border-t border-rule pt-s-3">
          <h3 className="text-sm font-semibold text-ink mb-3 capitalize">
            {category} <span className="text-ink-35 font-normal">({phrases.length})</span>
          </h3>
          <div className="space-y-3">
            {phrases.map((phrase) => (
              <div key={phrase.id} className="border-l-2 border-rule pl-3">
                <p className="text-sm text-ink-72">{phrase.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-ink-35">from: {phrase.jobTitle}</span>
                  {phrase.keywords.length > 0 && (
                    <div className="flex gap-1">
                      {phrase.keywords.slice(0, 5).map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 border border-rule text-ink-50 text-xs font-mono"
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
