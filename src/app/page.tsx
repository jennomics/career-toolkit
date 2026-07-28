"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
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
  skills: { id: string; name: string }[];
  responsibilities: { id: string; text: string; category: string }[];
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to load jobs (${res.status})`);
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

  // Client-side filtering (status + search + company + source)
  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Status filter
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
  }, [jobs, filter, searchQuery, companyFilter, sourceFilter]);

  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleKeywordClick = (keyword: string) => {
    // Set keyword as search query and scroll to results
    setSearchQuery(keyword);
    const el = document.getElementById("keywords-summary");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Career Toolkit</h1>
            <p className="text-sm text-gray-500 mt-1">
              Save job descriptions, track keywords, build your resume
            </p>
          </div>
          <Link
            href="/phrases"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Resume Phrases &rarr;
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
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
            totalCount={jobs.length}
          />
        )}

        {/* Status filter pills */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap gap-3" role="group" aria-label="Filter by status">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                filter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({jobs.length})
            </button>
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors capitalize ${
                  filter === status
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status} ({count})
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
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : filteredJobs.length === 0 && jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No jobs saved yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Click &ldquo;Add a Job Description&rdquo; above to get started.
              Paste a job description from LinkedIn or anywhere else.
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">
              No jobs match your search
              {searchQuery && <> for &ldquo;{searchQuery}&rdquo;</>}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setCompanyFilter("");
                setSourceFilter("");
                setFilter("all");
              }}
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
