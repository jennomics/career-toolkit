"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";
import AddJobForm from "@/components/AddJobForm";
import JobCard from "@/components/JobCard";
import KeywordsSummary from "@/components/KeywordsSummary";
import SearchFilter from "@/components/SearchFilter";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  description: string;
  status: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
  dreamCompany: boolean;
  dreamJob: boolean;
  skills: { id: string; name: string }[];
  responsibilities: { id: string; text: string; category: string }[];
}

type ViewMode = "active" | "all" | "archived";

const ARCHIVED_STATUSES = ["rejected", "closed"];

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, `Failed to load jobs (${res.status})`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount (ref prevents lint warning about setState in effect)
  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchJobs();
    }
  }, [fetchJobs]);

  // Derive unique companies and sources for filter dropdowns
  const companies = useMemo(() => {
    const set = new Set(jobs.map((j) => j.company));
    return Array.from(set).sort();
  }, [jobs]);

  const sources = useMemo(() => {
    const set = new Set(jobs.map((j) => j.source).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [jobs]);

  // Apply view mode filter first (active/archived/all)
  const viewFilteredJobs = useMemo(() => {
    if (viewMode === "active") {
      return jobs.filter((j) => !ARCHIVED_STATUSES.includes(j.status));
    }
    if (viewMode === "archived") {
      return jobs.filter((j) => ARCHIVED_STATUSES.includes(j.status));
    }
    return jobs;
  }, [jobs, viewMode]);

  // Client-side filtering (status + search + company + source) on top of view mode
  const filteredJobs = useMemo(() => {
    let result = viewFilteredJobs;

    // Status filter (within the current view)
    if (filter !== "all") {
      result = result.filter((j) => j.status === filter);
    }

    // Company filter
    if (companyFilter) {
      result = result.filter((j) => j.company === companyFilter);
    }

    // Source filter
    if (sourceFilter) {
      result = result.filter((j) => j.source === sourceFilter);
    }

    // Text search (client-side for instant feedback)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          (j.location && j.location.toLowerCase().includes(q)) ||
          j.description.toLowerCase().includes(q) ||
          j.skills.some((s) => s.name.toLowerCase().includes(q)) ||
          j.responsibilities.some((r) => r.text.toLowerCase().includes(q))
      );
    }

    return result;
  }, [viewFilteredJobs, filter, searchQuery, companyFilter, sourceFilter]);

  const statusCounts = viewFilteredJobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const activeCount = jobs.filter((j) => !ARCHIVED_STATUSES.includes(j.status)).length;
  const archivedCount = jobs.filter((j) => ARCHIVED_STATUSES.includes(j.status)).length;

  const handleKeywordClick = (keyword: string) => {
    // Set keyword as search query and scroll to results
    setSearchQuery(keyword);
    const el = document.getElementById("keywords-summary");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Job Library" subtitle="Save job descriptions, track keywords, build your resume" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-4">
        {/* Error display */}
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
          </div>
        )}

        {/* View Mode Toggle: Active / All / Archived - underline tabs */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-s-3 border-b border-rule" role="tablist" aria-label="View mode">
            <button
              role="tab"
              aria-selected={viewMode === "active"}
              onClick={() => { setViewMode("active"); setFilter("all"); }}
              className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
                viewMode === "active"
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              Active (<span className="font-mono">{activeCount}</span>)
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "all"}
              onClick={() => { setViewMode("all"); setFilter("all"); }}
              className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
                viewMode === "all"
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              All (<span className="font-mono">{jobs.length}</span>)
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "archived"}
              onClick={() => { setViewMode("archived"); setFilter("all"); }}
              className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
                viewMode === "archived"
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              Archived (<span className="font-mono">{archivedCount}</span>)
            </button>
          </div>
        )}

        {/* Search & Filter */}
        {jobs.length > 0 && (
          <SearchFilter
            onSearch={setSearchQuery}
            companies={companies}
            sources={sources}
            selectedCompany={companyFilter}
            selectedSource={sourceFilter}
            onCompanyChange={setCompanyFilter}
            onSourceChange={setSourceFilter}
            resultCount={filteredJobs.length}
            totalCount={viewFilteredJobs.length}
          />
        )}

        {/* Status filter pills */}
        {viewFilteredJobs.length > 0 && (
          <div className="flex flex-wrap gap-s-2" role="group" aria-label="Filter by status">
            <button
              onClick={() => setFilter("all")}
              className={`px-s-2 min-h-[44px] font-mono text-meta uppercase tracking-widest cursor-pointer ${
                filter === "all"
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              All (<span className="font-mono">{viewFilteredJobs.length}</span>)
            </button>
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-s-2 min-h-[44px] font-mono text-meta uppercase tracking-widest cursor-pointer ${
                  filter === status
                    ? "border-b-2 border-ink text-ink"
                    : "text-ink-50"
                }`}
              >
                {status} (<span className="font-mono">{count}</span>)
              </button>
            ))}
          </div>
        )}

        {/* Keywords Summary */}
        <div id="keywords-summary">
          <KeywordsSummary jobs={filteredJobs} />
        </div>

        {/* Add Job Form */}
        <AddJobForm onJobAdded={fetchJobs} />

        {/* Job List */}
        {loading ? (
          <p className="text-center text-ink-35 py-s-5">Loading...</p>
        ) : filteredJobs.length === 0 && jobs.length === 0 ? (
          <div className="text-center py-s-5">
            <p className="text-ink-50 text-h3 font-zen">No jobs saved yet</p>
            <p className="text-ink-35 text-body mt-s-1">
              Click &ldquo;Add a Job Description&rdquo; above to get started.
              Paste a job description from LinkedIn or anywhere else.
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-s-4">
            <p className="text-ink-35 text-body">
              No jobs match your{" "}
              {viewMode === "archived" ? "archived " : viewMode === "active" ? "active " : ""}
              filters
              {searchQuery && <> for &ldquo;{searchQuery}&rdquo;</>}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setCompanyFilter("");
                setSourceFilter("");
                setFilter("all");
              }}
              className="text-body text-ink underline mt-s-2 cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-rule">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onUpdate={fetchJobs}
                onDelete={fetchJobs}
                onKeywordClick={handleKeywordClick}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
