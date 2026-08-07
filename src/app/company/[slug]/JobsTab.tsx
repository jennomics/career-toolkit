"use client";

import { useState } from "react";
import { CompanyJob } from "./page";

interface JobsTabProps {
  jobs: CompanyJob[];
  onUpdate: () => void;
}

const STATUS_OPTIONS = ["saved", "applied", "interviewing", "offer", "rejected", "closed"];

export default function JobsTab({ jobs, onUpdate }: JobsTabProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(jobId: string, newStatus: string) {
    setUpdatingId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onUpdate();
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="border-t border-rule pt-s-4 text-center">
        <p className="text-ink-50">No jobs for this company yet.</p>
        <p className="text-xs text-ink-35 mt-1">
          Add jobs from the Job Library or sync companies from jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="border-t border-rule pt-s-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-ink truncate">
                  {job.title}
                </h3>
                {job.dreamJob && (
                  <span className="text-ink-50 text-sm" title="Dream Job">&#9733;</span>
                )}
              </div>
              <p className="text-xs text-ink-35 mt-1">
                Added {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={job.status}
                onChange={(e) => handleStatusChange(job.id, e.target.value)}
                disabled={updatingId === job.id}
                className="text-xs px-2 py-1 border border-rule text-ink-72 focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.skills.slice(0, 10).map((skill) => (
                <span
                  key={skill.id}
                  className="px-2 py-0.5 font-mono text-meta text-ink-50 text-xs font-medium"
                >
                  {skill.name}
                </span>
              ))}
              {job.skills.length > 10 && (
                <span className="text-xs text-ink-35">+{job.skills.length - 10} more</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
