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
      <p className="text-sm text-gray-400 italic">No signature stories yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <div
          key={story.id}
          className="border border-gray-200 rounded-lg p-4"
        >
          <button
            onClick={() =>
              setExpanded(expanded === story.id ? null : story.id)
            }
            aria-expanded={expanded === story.id}
            aria-label={`Toggle story: ${story.title}`}
            className="w-full text-left flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-gray-900">
              {story.title}
            </h3>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${
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
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Situation</p>
                <p className="text-sm text-gray-700">{story.situation}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Obstacle</p>
                <p className="text-sm text-gray-700">{story.obstacle}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Action</p>
                <p className="text-sm text-gray-700">{story.action}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Result</p>
                <p className="text-sm text-gray-700">{story.result}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  Why It Matters
                </p>
                <p className="text-sm text-gray-700">{story.whyItMatters}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
