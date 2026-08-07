"use client";

import { useState } from "react";

interface SignatureStory {
  id: string;
  title: string;
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  whyItMatters: string;
}

interface SignatureStoriesSectionProps {
  stories: SignatureStory[];
}

export default function SignatureStoriesSection({
  stories,
}: SignatureStoriesSectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (stories.length === 0) {
    return (
      <p className="text-body text-ink-35">No signature stories yet.</p>
    );
  }

  return (
    <div className="space-y-0">
      {stories.map((story) => (
        <div
          key={story.id}
          className="border-t border-rule py-s-2"
        >
          <button
            onClick={() =>
              setExpanded(expanded === story.id ? null : story.id)
            }
            aria-expanded={expanded === story.id}
            aria-label={`Toggle story: ${story.title}`}
            className="w-full text-left flex items-center justify-between min-h-[var(--target-min)] cursor-pointer"
          >
            <h3 className="text-body font-medium text-ink">
              {story.title}
            </h3>
            <svg
              className={`w-4 h-4 text-ink-50 transition-transform duration-200 ${
                expanded === story.id ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expanded === story.id && (
            <div className="mt-s-2 pt-s-2 border-t border-rule space-y-s-2">
              <div>
                <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Situation</p>
                <p className="text-body text-ink-72 mt-0.5">{story.situation}</p>
              </div>
              <div>
                <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Obstacle</p>
                <p className="text-body text-ink-72 mt-0.5">{story.obstacle}</p>
              </div>
              <div>
                <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Action</p>
                <p className="text-body text-ink-72 mt-0.5">{story.action}</p>
              </div>
              <div>
                <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Result</p>
                <p className="text-body text-ink-72 mt-0.5">{story.result}</p>
              </div>
              <div>
                <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Why it matters</p>
                <p className="text-body text-ink-72 mt-0.5">{story.whyItMatters}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
