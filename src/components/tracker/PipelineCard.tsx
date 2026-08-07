"use client";

import { useMemo } from "react";

export interface TrackerJob {
  id: string;
  title: string;
  company: string;
  status: string;
  priority: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  appliedAt: string | null;
  updatedAt: string;
  createdAt: string;
  salary: string | null;
  location: string | null;
}

interface PipelineCardProps {
  job: TrackerJob;
  onDragStart: (e: React.DragEvent, jobId: string) => void;
  onClick: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-live",
  medium: "bg-ink/50",
  low: "bg-ink/35",
};

export default function PipelineCard({ job, onDragStart, onClick }: PipelineCardProps) {
  const daysInStage = useMemo(() => {
    const updated = new Date(job.updatedAt);
    const now = new Date();
    return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
  }, [job.updatedAt]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${job.title} at ${job.company}. Priority: ${job.priority || "none"}. ${daysInStage} days in stage.`}
      className="border-t border-rule py-s-2 px-s-1 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-body font-medium text-ink truncate flex-1">
          {job.title}
        </h4>
        {job.priority && (
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${PRIORITY_COLORS[job.priority] || "bg-ink/35"}`}
            title={`Priority: ${job.priority}`}
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-list text-ink-72 mt-0.5 truncate">{job.company}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="font-mono text-meta text-ink-50">
          {daysInStage}d
        </span>
        {job.nextAction && (
          <span className="font-mono text-meta text-ink-50 truncate max-w-[120px]" title={job.nextAction}>
            {job.nextAction}
          </span>
        )}
      </div>
    </div>
  );
}
