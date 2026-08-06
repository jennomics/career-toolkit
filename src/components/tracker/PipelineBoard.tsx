"use client";

import { useState, useCallback } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { PIPELINE_STAGES, ARCHIVED_STATUSES } from "@/lib/tracker-helpers";
import PipelineCard, { type TrackerJob } from "./PipelineCard";

interface PipelineBoardProps {
  jobs: TrackerJob[];
  onJobUpdated: () => void;
  onJobClick: (job: TrackerJob) => void;
}

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

const STAGE_HEADER_COLORS: Record<string, string> = {
  saved: "border-t-gray-400",
  researching: "border-t-indigo-400",
  applied: "border-t-blue-400",
  screening: "border-t-cyan-400",
  interviewing: "border-t-yellow-400",
  "final-round": "border-t-orange-400",
  offer: "border-t-green-400",
  negotiating: "border-t-emerald-400",
  accepted: "border-t-green-600",
  rejected: "border-t-red-400",
  withdrawn: "border-t-amber-400",
  closed: "border-t-gray-300",
};

export default function PipelineBoard({ jobs, onJobUpdated, onJobClick }: PipelineBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeStages = PIPELINE_STAGES.filter((s) => !ARCHIVED_STATUSES.includes(s));
  const archivedStages = PIPELINE_STAGES.filter((s) => ARCHIVED_STATUSES.includes(s));
  const visibleStages = showArchived ? [...activeStages, ...archivedStages] : activeStages;

  // Group jobs by stage
  const grouped: Record<string, TrackerJob[]> = {};
  for (const stage of PIPELINE_STAGES) {
    grouped[stage] = [];
  }
  for (const job of jobs) {
    const stage = job.status || "saved";
    if (grouped[stage]) {
      grouped[stage].push(job);
    } else {
      grouped["saved"].push(job);
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData("text/plain", jobId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStage: string) => {
      e.preventDefault();
      setDragOverStage(null);
      const jobId = e.dataTransfer.getData("text/plain");
      if (!jobId) return;

      const job = jobs.find((j) => j.id === jobId);
      if (!job || job.status === newStage) return;

      try {
        setError(null);
        const res = await fetch(`/api/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStage }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(extractErrorMessage(errData, `Failed to move job to ${newStage}`));
          return;
        }
        onJobUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update job status");
      }
    },
    [jobs, onJobUpdated]
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""} across {visibleStages.length} stages
        </p>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          aria-pressed={showArchived}
        >
          {showArchived ? "Hide Archived" : "Show Archived"}
        </button>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-4"
        role="region"
        aria-label="Pipeline board"
      >
        {visibleStages.map((stage) => (
          <div
            key={stage}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
            className={`flex-shrink-0 w-64 bg-gray-50 rounded-lg border-t-4 ${STAGE_HEADER_COLORS[stage] || "border-t-gray-300"} ${
              dragOverStage === stage ? "ring-2 ring-blue-300 bg-blue-50" : ""
            }`}
            role="group"
            aria-label={`${STAGE_LABELS[stage] || stage} stage, ${grouped[stage].length} jobs`}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  {STAGE_LABELS[stage] || stage}
                </h3>
                <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full">
                  {grouped[stage].length}
                </span>
              </div>
            </div>
            <div className="p-2 space-y-2 min-h-[100px]">
              {grouped[stage].length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  Drop jobs here
                </p>
              ) : (
                grouped[stage].map((job) => (
                  <PipelineCard
                    key={job.id}
                    job={job}
                    onDragStart={handleDragStart}
                    onClick={() => onJobClick(job)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
