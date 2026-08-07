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
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
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
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">
          {job.title}
        </h4>
        {job.priority && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[job.priority] || "bg-gray-400"}`}
            title={`Priority: ${job.priority}`}
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-xs text-gray-500 mt-0.5 truncate">{job.company}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
          {daysInStage}d
        </span>
        {job.nextAction && (
          <span className="text-[10px] text-blue-600 truncate max-w-[120px]" title={job.nextAction}>
            {job.nextAction}
          </span>
        )}
      </div>
    </div>
  );
}
