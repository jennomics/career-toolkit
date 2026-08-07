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

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav title="Application Tracker" subtitle="Pipeline board, timeline, and application details" />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* View tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit" role="tablist" aria-label="Tracker view mode">
          <button
            role="tab"
            aria-selected={activeView === "pipeline"}
            onClick={() => setActiveView("pipeline")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeView === "pipeline"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pipeline
          </button>
          <button
            role="tab"
            aria-selected={activeView === "list"}
            onClick={() => setActiveView("list")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeView === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            List
          </button>
          <button
            role="tab"
            aria-selected={activeView === "timeline"}
            onClick={() => setActiveView("timeline")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeView === "timeline"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Timeline
          </button>
          <button
            role="tab"
            aria-selected={activeView === "analytics"}
            onClick={() => setActiveView("analytics")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeView === "analytics"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading tracker...</p>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md mx-auto shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">No jobs in your pipeline</h2>
              <p className="text-sm text-gray-500 mt-2">
                Add jobs from the Job Library to start tracking your applications through the pipeline.
              </p>
              <a
                href="/jobs"
                className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Job Library
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
              <div className="space-y-8">
                <AnalyticsDashboard />
                <section aria-labelledby="attention-heading" className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h3 id="attention-heading" className="text-base font-semibold text-gray-900 mb-4">
                    Needs Attention
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
