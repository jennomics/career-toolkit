"use client";

import { useState, useMemo, useCallback } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { PIPELINE_STAGES } from "@/lib/tracker-helpers";
import { type TrackerJob } from "./PipelineCard";

interface ListViewProps {
  jobs: TrackerJob[];
  onJobClick: (job: TrackerJob) => void;
  onJobUpdated?: () => void;
}

type SortKey = "company" | "title" | "status" | "appliedAt" | "updatedAt" | "nextAction" | "priority";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const STAGE_LABELS: Record<string, string> = {
  saved: "Saved",
  researching: "Researching",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  "final-round": "Final Round",
  offer: "Offer",
  negotiating: "Negotiating",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed: "Closed",
};

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        onClick={() => onSort(col)}
        className="flex items-center gap-1 hover:text-gray-700 cursor-pointer"
        aria-label={`Sort by ${label} ${sortKey === col ? (sortDir === "asc" ? "descending" : "ascending") : "ascending"}`}
      >
        {label}
        {sortKey === col && (
          <span aria-hidden="true">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </button>
    </th>
  );
}

function generateCSV(jobs: TrackerJob[]): string {
  const headers = ["Title", "Company", "Status", "Applied Date", "Priority", "Next Action", "Salary"];
  const rows = jobs.map((job) => [
    `"${(job.title || "").replace(/"/g, '""')}"`,
    `"${(job.company || "").replace(/"/g, '""')}"`,
    `"${job.status}"`,
    `"${job.appliedAt ? new Date(job.appliedAt).toLocaleDateString("en-US") : ""}"`,
    `"${job.priority || ""}"`,
    `"${(job.nextAction || "").replace(/"/g, '""')}"`,
    `"${(job.salary || "").replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export default function ListView({ jobs, onJobClick, onJobUpdated }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "appliedAt":
          cmp = (a.appliedAt || "").localeCompare(b.appliedAt || "");
          break;
        case "updatedAt":
          cmp = a.updatedAt.localeCompare(b.updatedAt);
          break;
        case "nextAction":
          cmp = (a.nextAction || "").localeCompare(b.nextAction || "");
          break;
        case "priority": {
          const pa = PRIORITY_ORDER[a.priority || ""] ?? 3;
          const pb = PRIORITY_ORDER[b.priority || ""] ?? 3;
          cmp = pa - pb;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [jobs, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const handleBulkAction = useCallback(
    async (action: "status" | "archive" | "delete", newStatus?: string) => {
      if (selectedIds.size === 0) return;
      setBulkLoading(true);
      setBulkError(null);

      const ids = Array.from(selectedIds);
      try {
        if (action === "delete") {
          const results = await Promise.allSettled(
            ids.map((id) =>
              fetch(`/api/jobs/${id}`, { method: "DELETE" })
            )
          );
          const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
          if (failed.length > 0) {
            setBulkError(`Failed to delete ${failed.length} of ${ids.length} jobs`);
          }
        } else {
          const status = action === "archive" ? "closed" : newStatus;
          if (!status) return;
          const results = await Promise.allSettled(
            ids.map((id) =>
              fetch(`/api/jobs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
              })
            )
          );
          const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
          if (failed.length > 0) {
            const firstFailed = results.find(
              (r) => r.status === "fulfilled" && !r.value.ok
            );
            if (firstFailed && firstFailed.status === "fulfilled") {
              const errData = await firstFailed.value.json().catch(() => ({}));
              setBulkError(extractErrorMessage(errData, `Failed to update ${failed.length} jobs`));
            } else {
              setBulkError(`Failed to update ${failed.length} of ${ids.length} jobs`);
            }
          }
        }
        setSelectedIds(new Set());
        onJobUpdated?.();
      } catch (err) {
        setBulkError(err instanceof Error ? err.message : "Bulk operation failed");
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, onJobUpdated]
  );

  const handleExportCSV = useCallback(() => {
    const csv = generateCSV(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No jobs to display in list view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex-wrap"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              disabled={bulkLoading}
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkAction("status", e.target.value);
                  e.target.value = "";
                }
              }}
              className="text-xs border border-blue-300 rounded-md px-2 py-1 bg-white text-gray-700 cursor-pointer disabled:opacity-50"
              aria-label="Bulk change status"
              defaultValue=""
            >
              <option value="" disabled>
                Change status...
              </option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage] || stage}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleBulkAction("archive")}
              disabled={bulkLoading}
              className="text-xs px-3 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-md hover:bg-amber-200 cursor-pointer disabled:opacity-50"
              aria-label="Archive selected jobs"
            >
              Archive
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${selectedIds.size} selected job(s)? This cannot be undone.`)) {
                  handleBulkAction("delete");
                }
              }}
              disabled={bulkLoading}
              className="text-xs px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 cursor-pointer disabled:opacity-50"
              aria-label="Delete selected jobs"
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {bulkError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
          {bulkError}
        </div>
      )}

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          aria-label="Export jobs as CSV"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200" role="grid" aria-label="Jobs list">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === jobs.length && jobs.length > 0}
                  onChange={toggleAll}
                  aria-label="Select all jobs"
                  className="rounded border-gray-300"
                />
              </th>
              <SortHeader label="Company" col="company" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Title" col="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Applied" col="appliedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Last Activity" col="updatedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Next Action" col="nextAction" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Priority" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sorted.map((job) => (
              <tr
                key={job.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onJobClick(job)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onJobClick(job);
                  }
                }}
                tabIndex={0}
                role="row"
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(job.id)}
                    onChange={() => toggleSelect(job.id)}
                    aria-label={`Select ${job.title} at ${job.company}`}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 font-medium">{job.company}</td>
                <td className="px-3 py-2 text-sm text-gray-700">{job.title}</td>
                <td className="px-3 py-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                    {job.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {job.appliedAt
                    ? new Date(job.appliedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {new Date(job.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px] truncate">
                  {job.nextAction || "-"}
                </td>
                <td className="px-3 py-2">
                  {job.priority && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                        job.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : job.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {job.priority}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
