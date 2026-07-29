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
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No jobs for this company yet.</p>
        <p className="text-xs text-gray-400 mt-1">
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
          className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {job.title}
                </h3>
                {job.dreamJob && (
                  <span className="text-yellow-500 text-sm" title="Dream Job">&#9733;</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Added {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={job.status}
                onChange={(e) => handleStatusChange(job.id, e.target.value)}
                disabled={updatingId === job.id}
                className="text-xs px-2 py-1 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
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
                  className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                >
                  {skill.name}
                </span>
              ))}
              {job.skills.length > 10 && (
                <span className="text-xs text-gray-400">+{job.skills.length - 10} more</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
