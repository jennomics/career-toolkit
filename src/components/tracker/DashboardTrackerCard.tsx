"use client";

import { useEffect, useState, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import AttentionWidget from "./AttentionWidget";

interface PipelineData {
  stages: string[];
  pipeline: Record<string, { count: number }>;
  totalJobs: number;
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

const ACTIVE_STAGES = ["saved", "researching", "applied", "screening", "interviewing", "final-round", "offer", "negotiating"];

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ""}`} />;
}

export default function DashboardTrackerCard() {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchPipeline() {
      try {
        const res = await fetch("/api/tracker/pipeline");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(extractErrorMessage(errData, "Failed to load pipeline data"));
          return;
        }
        const json = await res.json();
        setPipelineData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to pipeline");
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
        {error}
      </div>
    );
  }

  if (!pipelineData || pipelineData.totalJobs === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">
          No pipeline data yet. Add jobs to your tracker to see stats here.
        </p>
      </div>
    );
  }

  const activeCount = ACTIVE_STAGES.reduce(
    (sum, s) => sum + (pipelineData.pipeline[s]?.count || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Pipeline Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Active Pipeline ({activeCount})
          </h3>
          <a
            href="/tracker"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View Tracker
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ACTIVE_STAGES.filter((s) => (pipelineData.pipeline[s]?.count || 0) > 0).map((stage) => (
            <div
              key={stage}
              className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
            >
              <p className="text-xs text-gray-500">{STAGE_LABELS[stage]}</p>
              <p className="text-lg font-bold text-gray-900">
                {pipelineData.pipeline[stage]?.count || 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Attention Widget */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Needs Attention</h3>
        <AttentionWidget compact />
      </div>
    </div>
  );
}
