"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";
import PipelineBoard from "@/components/tracker/PipelineBoard";
import ListView from "@/components/tracker/ListView";
import TimelineView from "@/components/tracker/TimelineView";
import AnalyticsDashboard from "@/components/tracker/AnalyticsDashboard";
import AttentionWidget from "@/components/tracker/AttentionWidget";
import DetailDrawer from "@/components/tracker/DetailDrawer";
import { type TrackerJob } from "@/components/tracker/PipelineCard";

type ViewTab = "pipeline" | "list" | "timeline" | "analytics";

export default function TrackerPage() {
  const [jobs, setJobs] = useState<TrackerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewTab>("pipeline");
  const [selectedJob, setSelectedJob] = useState<TrackerJob | null>(null);
  const hasFetched = useRef(false);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/jobs");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to load jobs"));
        return;
      }
      const data = await res.json();
      // Map to TrackerJob shape
      const mapped: TrackerJob[] = data.map(
        (j: {
          id: string;
          title: string;
          company: string;
          status: string;
          priority?: string | null;
          nextAction?: string | null;
          nextActionDate?: string | null;
          appliedAt?: string | null;
          updatedAt: string;
          createdAt: string;
          salary?: string | null;
          location?: string | null;
        }) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          status: j.status,
          priority: j.priority || null,
          nextAction: j.nextAction || null,
          nextActionDate: j.nextActionDate || null,
          appliedAt: j.appliedAt || null,
          updatedAt: j.updatedAt,
          createdAt: j.createdAt,
          salary: j.salary || null,
          location: j.location || null,
        })
      );
      setJobs(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchJobs();
    }
  }, [fetchJobs]);

  const handleJobClick = (job: TrackerJob) => {
    setSelectedJob(job);
  };

  const handleAttentionJobClick = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJob(job);
    }
  };

  const handleDrawerClose = () => {
    setSelectedJob(null);
  };

  const handleJobUpdated = () => {
    fetchJobs();
  };

  const viewTabs: { key: ViewTab; label: string }[] = [
    { key: "pipeline", label: "Pipeline" },
    { key: "list", label: "List" },
    { key: "timeline", label: "Timeline" },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Application Tracker" subtitle="Pipeline board, timeline, and application details" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-4">
        {/* Error display */}
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
          </div>
        )}

        {/* View tabs - underline pattern */}
        <div className="flex items-center gap-s-3 border-b border-rule" role="tablist" aria-label="Tracker view mode">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeView === tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
                activeView === tab.key
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center text-ink-35 py-s-5">Loading tracker...</p>
        ) : jobs.length === 0 ? (
          <div className="text-center py-s-5">
            <div className="border-t border-rule pt-s-4 max-w-md mx-auto">
              <h2 className="text-h3 font-zen font-medium text-ink">No jobs in your pipeline</h2>
              <p className="text-body text-ink-50 mt-s-2">
                Add jobs from the job library to start tracking your applications through the pipeline.
              </p>
              <a
                href="/jobs"
                className="inline-flex items-center mt-s-3 px-s-3 border-[1.5px] border-live text-live text-body font-medium h-[48px] cursor-pointer"
              >
                Go to job library
              </a>
            </div>
          </div>
        ) : (
          <>
            {activeView === "pipeline" && (
              <PipelineBoard
                jobs={jobs}
                onJobUpdated={handleJobUpdated}
                onJobClick={handleJobClick}
              />
            )}
            {activeView === "list" && (
              <ListView jobs={jobs} onJobClick={handleJobClick} onJobUpdated={handleJobUpdated} />
            )}
            {activeView === "timeline" && (
              <TimelineView
                jobs={jobs.map((j) => ({ id: j.id, title: j.title, company: j.company }))}
              />
            )}
            {activeView === "analytics" && (
              <div className="space-y-s-4">
                <AnalyticsDashboard />
                <section aria-labelledby="attention-heading" className="border-t border-rule pt-s-3">
                  <h3 id="attention-heading" className="text-h3 font-zen font-medium text-ink mb-s-3">
                    Needs attention
                  </h3>
                  <AttentionWidget onJobClick={handleAttentionJobClick} />
                </section>
              </div>
            )}
          </>
        )}
      </main>

      {/* Detail Drawer */}
      <DetailDrawer
        job={selectedJob}
        onClose={handleDrawerClose}
        onJobUpdated={handleJobUpdated}
      />
    </div>
  );
}
