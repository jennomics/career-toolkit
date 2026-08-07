"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string | number;
}

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-t border-rule">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
        className="w-full flex items-center justify-between py-s-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-s-2">
          <h2 className="text-h3 font-medium text-ink">{title}</h2>
          {badge !== undefined && (
            <span className="font-mono text-meta text-ink-50">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-ink-50 transition-transform ${
            isOpen ? "rotate-180" : ""
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
      {isOpen && (
        <div
          id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="pb-s-3"
          role="region"
          aria-label={title}
        >
          {children}
        </div>
      )}
    </section>
  );
}
