"use client";

import { useState } from "react";

interface Highlight {
  id: string;
  text: string;
  category: string;
  metrics: string | null;
  keywords: string[];
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string;
  industry: string | null;
  department: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: string;
  skills: { id: string; name: string }[];
  highlights: Highlight[];
}

interface ExperienceCardProps {
  experience: Experience;
  onEdit: (experience: Experience) => void;
  onDelete: () => void;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

const HIGHLIGHT_CATEGORY_STYLES: Record<string, string> = {
  achievement: "bg-green-100 text-green-700",
  responsibility: "bg-blue-100 text-blue-700",
  project: "bg-purple-100 text-purple-700",
  award: "bg-amber-100 text-amber-700",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getDuration(startStr: string, endStr: string | null): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

export default function ExperienceCard({ experience, onEdit, onDelete }: ExperienceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this experience entry?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/experience/${experience.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete();
      }
    } catch {
      // Silently fail — user can retry
    }
    setIsDeleting(false);
  };

  const duration = getDuration(experience.startDate, experience.endDate);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{experience.title}</h3>
            {experience.isCurrent && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Current
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {experience.company}
            {experience.location && ` \u2022 ${experience.location}`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(experience.startDate)} &ndash;{" "}
            {experience.isCurrent ? "Present" : experience.endDate ? formatDate(experience.endDate) : "Present"}
            {" \u2022 "}
            {duration}
            {experience.employmentType !== "full-time" && (
              <> &middot; {EMPLOYMENT_TYPE_LABELS[experience.employmentType] || experience.employmentType}</>
            )}
          </p>
          {(experience.industry || experience.department) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {[experience.department, experience.industry].filter(Boolean).join(" \u2022 ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer"
            aria-expanded={expanded}
            aria-label={expanded ? "Show less details" : "Show more details"}
          >
            {expanded ? "Less" : "More"}
          </button>
          <button
            onClick={() => onEdit(experience)}
            className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 cursor-pointer"
            aria-label={`Edit ${experience.title} at ${experience.company}`}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 cursor-pointer disabled:opacity-50"
            aria-label={`Delete ${experience.title} at ${experience.company}`}
          >
            {isDeleting ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Skills */}
      {experience.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {experience.skills.map((skill) => (
            <span
              key={skill.id}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
            >
              {skill.name}
            </span>
          ))}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
          {/* Description */}
          {experience.description && (
            <p className="text-sm text-gray-700">{experience.description}</p>
          )}

          {/* Highlights */}
          {experience.highlights.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Key Highlights
              </h4>
              <ul className="space-y-2">
                {experience.highlights.map((h) => (
                  <li key={h.id} className="flex items-start gap-2 text-sm text-gray-800">
                    <span
                      className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                        HIGHLIGHT_CATEGORY_STYLES[h.category] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {h.category}
                    </span>
                    <div>
                      <span>{h.text}</span>
                      {h.metrics && (
                        <span className="ml-1 text-green-600 font-medium text-xs">
                          ({h.metrics})
                        </span>
                      )}
                      {h.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {h.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
