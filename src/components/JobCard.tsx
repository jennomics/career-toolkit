"use client";

import { useState } from "react";

interface Responsibility {
  id: string;
  text: string;
  category: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  description: string;
  status: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
  skills: { id: string; name: string }[];
  responsibilities: Responsibility[];
}

interface JobCardProps {
  job: Job;
  onUpdate: () => void;
  onDelete: () => void;
  onKeywordClick?: (keyword: string) => void;
}

const STATUS_OPTIONS = [
  { value: "saved", label: "Saved", color: "bg-gray-100 text-gray-700" },
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { value: "interviewing", label: "Interviewing", color: "bg-yellow-100 text-yellow-700" },
  { value: "offer", label: "Offer", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-500" },
];

const ARCHIVED_STATUSES = ["rejected", "closed"];

export default function JobCard({ job, onUpdate, onDelete, onKeywordClick }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === job.status) || STATUS_OPTIONS[0];
  const isArchived = ARCHIVED_STATUSES.includes(job.status);

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate();
  };

  const handleArchive = async () => {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    onUpdate();
  };

  const handleUnarchive = async () => {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "saved" }),
    });
    onUpdate();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this job?")) return;
    setIsDeleting(true);
    await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    onDelete();
  };

  const formattedDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${isArchived ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusConfig.color}`}
              aria-label={`Status for ${job.title}`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-600">
            {job.company}
            {job.location && ` \u2022 ${job.location}`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Added {formattedDate}
            {job.source && ` \u2022 via ${job.source}`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1"
              aria-label={`Open job posting link for ${job.title}`}
            >
              Link
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer"
            aria-expanded={expanded}
            aria-label={expanded ? "Show less details" : "Show more details"}
          >
            {expanded ? "Less" : "More"}
          </button>
          {isArchived ? (
            <button
              onClick={handleUnarchive}
              className="text-xs text-green-500 hover:text-green-700 px-2 py-1 cursor-pointer"
              aria-label={`Unarchive ${job.title}`}
            >
              Restore
            </button>
          ) : (
            <button
              onClick={handleArchive}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer"
              aria-label={`Archive ${job.title}`}
            >
              Archive
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 cursor-pointer disabled:opacity-50"
            aria-label={`Delete ${job.title}`}
          >
            Delete
          </button>
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.skills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => onKeywordClick?.(skill.name)}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 cursor-pointer transition-colors"
            >
              {skill.name}
            </button>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          {/* Resume-Ready Phrases */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Resume-Ready Phrases
              </h4>
              <ul className="space-y-1.5">
                {job.responsibilities.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                      r.category === "responsibility"
                        ? "bg-green-100 text-green-700"
                        : r.category === "requirement"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {r.category === "responsibility" ? "DO" : r.category === "requirement" ? "NEED" : "NICE"}
                    </span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Description */}
          <details className="group">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-2">
              Show full description
            </summary>
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {job.description}
            </div>
          </details>

          {job.notes && (
            <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-gray-600">
              <strong className="text-gray-700">Notes:</strong> {job.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
