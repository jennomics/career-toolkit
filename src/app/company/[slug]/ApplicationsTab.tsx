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
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No active applications.</p>
        <p className="text-xs text-gray-400 mt-1">
          Jobs will appear here when you change their status to applied, interviewing, offer, or rejected.
        </p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    applied: "bg-blue-100 text-blue-800 border-blue-200",
    interviewing: "bg-yellow-100 text-yellow-800 border-yellow-200",
    offer: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  const statusBorderColors: Record<string, string> = {
    applied: "border-l-blue-400",
    interviewing: "border-l-yellow-400",
    offer: "border-l-green-400",
    rejected: "border-l-red-400",
  };

  return (
    <div className="space-y-6">
      {grouped.map(([status, statusJobs]) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${statusColors[status] || "bg-gray-100 text-gray-700"}`}>
              {status}
            </span>
            <span className="text-xs text-gray-400">{statusJobs.length} {statusJobs.length === 1 ? "job" : "jobs"}</span>
          </div>
          <div className="space-y-2">
            {statusJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm border-l-4 ${statusBorderColors[status] || ""}`}
              >
                <h4 className="text-sm font-medium text-gray-900">{job.title}</h4>
                <p className="text-xs text-gray-400 mt-1">
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
