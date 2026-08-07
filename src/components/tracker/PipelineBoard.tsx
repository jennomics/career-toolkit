"use client";

import { useState, useCallback, useRef, useMemo } from "react";
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

export default function PipelineBoard({ jobs, onJobUpdated, onJobClick }: PipelineBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const announcementRef = useRef<HTMLDivElement>(null);

  const activeStages = PIPELINE_STAGES.filter((s) => !ARCHIVED_STATUSES.includes(s));
  const archivedStages = PIPELINE_STAGES.filter((s) => ARCHIVED_STATUSES.includes(s));
  const visibleStages = useMemo(
    () => (showArchived ? [...activeStages, ...archivedStages] : activeStages),
    [showArchived, activeStages, archivedStages]
  );

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

  const announce = (message: string) => {
    setAnnouncement(message);
  };

  const moveJobToStage = useCallback(
    async (jobId: string, newStage: string) => {
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
        announce(
          `${job.title} moved from ${STAGE_LABELS[job.status] || job.status} to ${STAGE_LABELS[newStage] || newStage}`
        );
        onJobUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update job status");
      }
    },
    [jobs, onJobUpdated]
  );

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData("text/plain", jobId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(jobId);
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStage(null);
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
      setDraggingId(null);
      const jobId = e.dataTransfer.getData("text/plain");
      if (!jobId) return;
      await moveJobToStage(jobId, newStage);
    },
    [moveJobToStage]
  );

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, job: TrackerJob) => {
      if (e.ctrlKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const currentIdx = visibleStages.indexOf(job.status as typeof visibleStages[number]);
        if (currentIdx === -1) return;

        const nextIdx = e.key === "ArrowLeft" ? currentIdx - 1 : currentIdx + 1;
        if (nextIdx < 0 || nextIdx >= visibleStages.length) return;

        const newStage = visibleStages[nextIdx];
        moveJobToStage(job.id, newStage);
      }
    },
    [visibleStages, moveJobToStage]
  );

  return (
    <div className="space-y-4">
      {/* ARIA live region for announcements */}
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {error && (
        <div className="border-t border-rule p-s-2 text-live text-body" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="font-mono text-meta text-ink-50">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""} across {visibleStages.length} stages
        </p>
        <div className="flex items-center gap-s-3">
          <span className="font-mono text-meta text-ink-35">
            Ctrl+Arrow Left/Right to move cards
          </span>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer font-mono text-meta"
            aria-pressed={showArchived}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
        </div>
      </div>

      <div
        className="flex gap-s-2 overflow-x-auto pb-4"
        role="region"
        aria-label="Pipeline board"
      >
        {visibleStages.map((stage) => {
          const isDropTarget = dragOverStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
              className={`flex-shrink-0 w-64 border-t border-rule ${
                isDropTarget
                  ? "border-2 border-dashed border-rule bg-paper"
                  : "bg-paper"
              }`}
              role="group"
              aria-label={`${STAGE_LABELS[stage] || stage} stage, ${grouped[stage].length} jobs`}
            >
              <div className="p-s-2 border-b border-rule">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-meta uppercase tracking-widest text-ink-50">
                    {STAGE_LABELS[stage] || stage}
                  </h3>
                  <span className="font-mono text-meta text-ink-50">
                    {grouped[stage].length}
                  </span>
                </div>
              </div>
              <div className="p-s-1 space-y-0 min-h-[100px]">
                {grouped[stage].length === 0 ? (
                  <p className="text-meta text-ink-35 text-center py-s-4 font-mono">
                    {isDropTarget ? "Drop here" : "Drop jobs here"}
                  </p>
                ) : (
                  grouped[stage].map((job) => (
                    <div
                      key={job.id}
                      onDragEnd={handleDragEnd}
                      onKeyDown={(e) => handleCardKeyDown(e, job)}
                      className={`transition-opacity duration-200 ${
                        draggingId === job.id ? "opacity-40" : ""
                      }`}
                    >
                      <PipelineCard
                        job={job}
                        onDragStart={handleDragStart}
                        onClick={() => onJobClick(job)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
