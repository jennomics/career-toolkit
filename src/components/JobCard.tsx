"use client";

import { useState } from "react";
import DecompositionPanel from "./DecompositionPanel";

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
  dreamCompany: boolean;
  dreamJob: boolean;
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
  { value: "saved", label: "Saved" },
  { value: "researching", label: "Researching" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interviewing", label: "Interviewing" },
  { value: "final-round", label: "Final Round" },
  { value: "offer", label: "Offer" },
  { value: "negotiating", label: "Negotiating" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "closed", label: "Closed" },
];

const ARCHIVED_STATUSES = ["rejected", "closed", "withdrawn"];

export default function JobCard({ job, onUpdate, onDelete, onKeywordClick }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingDreamCompany, setTogglingDreamCompany] = useState(false);
  const [togglingDreamJob, setTogglingDreamJob] = useState(false);

  const isArchived = ARCHIVED_STATUSES.includes(job.status);
  const isDream = job.dreamCompany || job.dreamJob;

  const handleStatusChange = async (newStatus: string) => {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate();
  };

  const handleToggleDreamCompany = async () => {
    setTogglingDreamCompany(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/dream`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamCompany: !job.dreamCompany }),
      });
      if (!res.ok) {
        console.error("Failed to toggle dream company:", res.status);
        return;
      }
      onUpdate();
    } catch (err) {
      console.error("Error toggling dream company:", err);
    } finally {
      setTogglingDreamCompany(false);
    }
  };

  const handleToggleDreamJob = async () => {
    setTogglingDreamJob(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/dream`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamJob: !job.dreamJob }),
      });
      if (!res.ok) {
        console.error("Failed to toggle dream job:", res.status);
        return;
      }
      onUpdate();
    } catch (err) {
      console.error("Error toggling dream job:", err);
    } finally {
      setTogglingDreamJob(false);
    }
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
    <div className={`border-t border-rule py-s-3 ${isArchived ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-s-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-s-2 mb-s-1">
            {/* Dream state dot */}
            {isDream && (
              <span className="w-1.5 h-1.5 bg-live shrink-0" aria-label="Priority role" />
            )}
            <h3 className="text-body font-medium text-ink truncate">{job.title}</h3>
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="font-mono text-meta text-ink-50 border-0 bg-transparent cursor-pointer focus:outline-none"
              aria-label={`Status for ${job.title}`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-body text-ink-72 flex items-center gap-s-1">
            <button
              onClick={handleToggleDreamCompany}
              disabled={togglingDreamCompany}
              className={`min-h-[var(--target-min)] inline-flex items-center cursor-pointer transition-colors ${
                job.dreamCompany ? "text-live" : "text-ink-35"
              }`}
              title={job.dreamCompany ? "Dream company (click to remove)" : "Mark as dream company"}
              aria-label={job.dreamCompany ? "Remove dream company designation" : "Mark as dream company"}
            >
              <span className={`w-1.5 h-1.5 ${job.dreamCompany ? "bg-live" : "bg-rule"}`} />
            </button>
            <button
              onClick={handleToggleDreamJob}
              disabled={togglingDreamJob}
              className={`min-h-[var(--target-min)] inline-flex items-center cursor-pointer transition-colors ${
                job.dreamJob ? "text-live" : "text-ink-35"
              }`}
              title={job.dreamJob ? "Dream job (click to remove)" : "Mark as dream job"}
              aria-label={job.dreamJob ? "Remove dream job designation" : "Mark as dream job"}
            >
              <span className={`w-1.5 h-1.5 ${job.dreamJob ? "bg-live" : "bg-rule"}`} />
            </button>
            <span>
              {job.company}
              {job.location && ` / ${job.location}`}
            </span>
          </p>
          <p className="font-mono text-meta text-ink-50 mt-s-1">
            Added {formattedDate}
            {job.source && ` / via ${job.source}`}
          </p>
        </div>

        <div className="flex items-center gap-s-2">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline min-h-[var(--target-min)] inline-flex items-center text-meta"
              aria-label={`Open job posting link for ${job.title}`}
            >
              Link
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
            aria-expanded={expanded}
            aria-label={expanded ? "Show less details" : "Show more details"}
          >
            {expanded ? "Less" : "More"}
          </button>
          {isArchived ? (
            <button
              onClick={handleUnarchive}
              className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
              aria-label={`Unarchive ${job.title}`}
            >
              Restore
            </button>
          ) : (
            <button
              onClick={handleArchive}
              className="text-ink-50 underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
              aria-label={`Archive ${job.title}`}
            >
              Archive
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-ink-50 underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta disabled:opacity-50"
            aria-label={`Delete ${job.title}`}
          >
            Delete
          </button>
        </div>
      </div>

      {job.skills.length > 0 && (
        <div className="mt-s-2">
          <span className="font-mono text-body text-ink-72">
            {job.skills.map((skill, i) => (
              <button
                key={skill.id}
                onClick={() => onKeywordClick?.(skill.name)}
                className="underline cursor-pointer"
              >
                {skill.name}{i < job.skills.length - 1 ? ", " : ""}
              </button>
            ))}
          </span>
        </div>
      )}

      {expanded && (
        <div className="mt-s-3 pt-s-2 border-t border-rule">
          {/* Resume-Ready Phrases */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="mb-s-3">
              <h4 className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
                Resume-ready phrases
              </h4>
              <ul className="space-y-s-1">
                {job.responsibilities.map((r) => (
                  <li key={r.id} className="flex items-start gap-s-1 text-body text-ink-72">
                    <span className="font-mono text-meta uppercase text-ink-50 shrink-0 mt-0.5">
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
            <summary className="font-mono text-meta text-ink-50 cursor-pointer mb-s-1">
              Show full description
            </summary>
            <div className="text-body text-ink-72 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {job.description}
            </div>
          </details>

          {/* Posting Decomposition */}
          <DecompositionPanel jobId={job.id} />

          {job.notes && (
            <div className="mt-s-2 border-t border-rule pt-s-2 text-body text-ink-72">
              <span className="font-mono text-meta uppercase text-ink-50">Notes:</span> {job.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
