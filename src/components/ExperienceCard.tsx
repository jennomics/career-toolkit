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
      // Silently fail
    }
    setIsDeleting(false);
  };

  const duration = getDuration(experience.startDate, experience.endDate);

  return (
    <div className="border-t border-rule py-s-3">
      <div className="flex items-start justify-between gap-s-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-s-2 mb-s-1">
            <h3 className="text-body font-medium text-ink truncate">{experience.title}</h3>
            {experience.isCurrent && (
              <span className="font-mono text-meta text-live">current</span>
            )}
          </div>
          <p className="text-body text-ink-72">
            {experience.company}
            {experience.location && ` / ${experience.location}`}
          </p>
          <p className="font-mono text-meta text-ink-50 mt-s-1">
            {formatDate(experience.startDate)} &ndash;{" "}
            {experience.isCurrent ? "Present" : experience.endDate ? formatDate(experience.endDate) : "Present"}
            {" / "}
            {duration}
            {experience.employmentType !== "full-time" && (
              <> / {EMPLOYMENT_TYPE_LABELS[experience.employmentType] || experience.employmentType}</>
            )}
          </p>
          {(experience.industry || experience.department) && (
            <p className="font-mono text-meta text-ink-50 mt-0.5">
              {[experience.department, experience.industry].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-s-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-ink-50 underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
            aria-expanded={expanded}
            aria-label={expanded ? "Show less details" : "Show more details"}
          >
            {expanded ? "Less" : "More"}
          </button>
          <button
            onClick={() => onEdit(experience)}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
            aria-label={`Edit ${experience.title} at ${experience.company}`}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-ink-50 underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta disabled:opacity-50"
            aria-label={`Delete ${experience.title} at ${experience.company}`}
          >
            {isDeleting ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Skills */}
      {experience.skills.length > 0 && (
        <p className="font-mono text-body text-ink-72 mt-s-2">
          {experience.skills.map((skill) => skill.name).join(", ")}
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-s-3 pt-s-2 border-t border-rule space-y-s-2">
          {/* Description */}
          {experience.description && (
            <p className="text-body text-ink-72">{experience.description}</p>
          )}

          {/* Highlights */}
          {experience.highlights.length > 0 && (
            <div>
              <h4 className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
                Key highlights
              </h4>
              <ul className="space-y-s-1">
                {experience.highlights.map((h) => (
                  <li key={h.id} className="flex items-start gap-s-1 text-body text-ink-72">
                    <span className="font-mono text-meta uppercase text-ink-50 shrink-0 mt-0.5">
                      {h.category}
                    </span>
                    <div>
                      <span>{h.text}</span>
                      {h.metrics && (
                        <span className="font-mono text-meta text-ink-50 ml-s-1">
                          ({h.metrics})
                        </span>
                      )}
                      {h.keywords.length > 0 && (
                        <span className="font-mono text-meta text-ink-50 ml-s-1">
                          [{h.keywords.join(", ")}]
                        </span>
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
