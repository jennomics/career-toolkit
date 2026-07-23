"use client";

import { useEffect, useState, useCallback } from "react";
import AddJobForm from "@/components/AddJobForm";
import JobCard from "@/components/JobCard";
import SkillsSummary from "@/components/SkillsSummary";

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
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Career Toolkit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Save job descriptions, track skills, build your resume
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats bar */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap gap-3">
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

        {/* Skills Summary */}
        <SkillsSummary jobs={jobs} />

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
          <p className="text-center text-gray-400 py-8">
            No jobs with status &ldquo;{filter}&rdquo;
          </p>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onUpdate={fetchJobs}
                onDelete={fetchJobs}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
