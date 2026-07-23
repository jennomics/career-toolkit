"use client";

import { useState } from "react";

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
}

interface JobCardProps {
  job: Job;
  onUpdate: () => void;
  onDelete: () => void;
}

const STATUS_OPTIONS = [
  { value: "saved", label: "Saved", color: "bg-gray-100 text-gray-700" },
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { value: "interviewing", label: "Interviewing", color: "bg-yellow-100 text-yellow-700" },
  { value: "offer", label: "Offer", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-500" },
];

export default function JobCard({ job, onUpdate, onDelete }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === job.status) || STATUS_OPTIONS[0];

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusConfig.color}`}
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
            >
              Link
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 cursor-pointer"
          >
            {expanded ? "Less" : "More"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 cursor-pointer disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.skills.map((skill) => (
            <span
              key={skill.id}
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
            >
              {skill.name}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {job.description}
          </div>
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
