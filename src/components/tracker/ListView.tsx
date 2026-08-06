"use client";

import { useState, useMemo } from "react";
import { type TrackerJob } from "./PipelineCard";

interface ListViewProps {
  jobs: TrackerJob[];
  onJobClick: (job: TrackerJob) => void;
}

type SortKey = "company" | "title" | "status" | "appliedAt" | "updatedAt" | "nextAction" | "priority";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

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

export default function ListView({ jobs, onJobClick }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No jobs to display in list view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-700 font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

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
