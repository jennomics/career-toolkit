"use client";

import { useMemo } from "react";
import { CompanyJob } from "./page";

interface ApplicationsTabProps {
  jobs: CompanyJob[];
}

const APPLICATION_STATUSES = ["applied", "interviewing", "offer", "rejected"];

export default function ApplicationsTab({ jobs }: ApplicationsTabProps) {
  const grouped = useMemo(() => {
    const groups = new Map<string, CompanyJob[]>();
    for (const status of APPLICATION_STATUSES) {
      groups.set(status, []);
    }
    for (const job of jobs) {
      if (APPLICATION_STATUSES.includes(job.status)) {
        const list = groups.get(job.status) || [];
        list.push(job);
        groups.set(job.status, list);
      }
    }
    return Array.from(groups.entries()).filter(([, jobList]) => jobList.length > 0);
  }, [jobs]);

  if (grouped.length === 0) {
    return (
      <div className="border-t border-rule pt-s-4 text-center">
        <p className="text-ink-50">No active applications.</p>
        <p className="text-xs text-ink-35 mt-1">
          Jobs will appear here when you change their status to applied, interviewing, offer, or rejected.
        </p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    applied: "font-mono text-meta text-ink-50 border-rule",
    interviewing: "font-mono text-meta text-ink-50 border-rule",
    offer: "font-mono text-meta text-ink-50 border-rule",
    rejected: "font-mono text-meta text-ink-50 border-rule",
  };

  const statusBorderColors: Record<string, string> = {
    applied: "",
    interviewing: "",
    offer: "",
    rejected: "",
  };

  return (
    <div className="space-y-6">
      {grouped.map(([status, statusJobs]) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 text-xs font-medium border capitalize ${statusColors[status] || "border border-ink text-ink bg-transparent"}`}>
              {status}
            </span>
            <span className="text-xs text-ink-35">{statusJobs.length} {statusJobs.length === 1 ? "job" : "jobs"}</span>
          </div>
          <div className="space-y-2">
            {statusJobs.map((job) => (
              <div
                key={job.id}
                className={`border-t border-rule pt-s-2 border-l-4 ${statusBorderColors[status] || ""}`}
              >
                <h4 className="text-sm font-medium text-ink">{job.title}</h4>
                <p className="text-xs text-ink-35 mt-1">
                  Last updated {new Date(job.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
