"use client";

import { useState, useId } from "react";

interface CollapsibleSectionProps {
  title: string;
  badge?: string | number;
  badgeColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  badge,
  badgeColor = "bg-gray-100 text-gray-600",
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
        aria-expanded={isOpen}
        aria-controls={contentId}
        type="button"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {badge !== undefined && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
        <div id={contentId} className="border-t border-gray-100 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
