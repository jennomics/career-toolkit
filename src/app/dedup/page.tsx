"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/extract-error-message";

// Types for company duplicates
interface CompanyDuplicate {
  id: string;
  name: string;
  slug: string;
  jobCount: number;
  createdAt: string;
}

interface CompanyDuplicateGroup {
  normalizedName: string;
  companies: CompanyDuplicate[];
  suggestedKeepId: string;
}

// Types for job duplicates
interface JobDuplicate {
  id: string;
  title: string;
  company: string;
  status: string;
  skillCount: number;
  responsibilityCount: number;
  descriptionLength: number;
  richness: number;
  createdAt: string;
}

interface JobDuplicateGroup {
  reason: string;
  jobs: JobDuplicate[];
}

type Tab = "companies" | "jobs";

export default function DedupPage() {
  const [activeTab, setActiveTab] = useState<Tab>("companies");

  // Company duplicates state
  const [companyGroups, setCompanyGroups] = useState<CompanyDuplicateGroup[]>([]);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companySelections, setCompanySelections] = useState<Record<string, string>>({});
  const [companyMerging, setCompanyMerging] = useState<Record<string, boolean>>({});
  const [companySuccess, setCompanySuccess] = useState<Record<string, string>>({});

  // Job duplicates state
  const [jobGroups, setJobGroups] = useState<JobDuplicateGroup[]>([]);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobSelections, setJobSelections] = useState<Record<number, string>>({});
  const [jobMerging, setJobMerging] = useState<Record<number, boolean>>({});
  const [jobSuccess, setJobSuccess] = useState<Record<number, string>>({});

  const companyFetched = useRef(false);
  const jobFetched = useRef(false);

  // Fetch company duplicates
  useEffect(() => {
    if (companyFetched.current) return;
    companyFetched.current = true;

    async function fetchCompanyDuplicates() {
      try {
        setCompanyError(null);
        const res = await fetch("/api/companies/duplicates");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(data, `Failed to fetch (${res.status})`));
        }
        const data: CompanyDuplicateGroup[] = await res.json();
        setCompanyGroups(data);
        // Pre-select suggested keep for each group
        const selections: Record<string, string> = {};
        for (const group of data) {
          selections[group.normalizedName] = group.suggestedKeepId;
        }
        setCompanySelections(selections);
      } catch (err) {
        setCompanyError(err instanceof Error ? err.message : "Failed to fetch company duplicates");
      } finally {
        setCompanyLoading(false);
      }
    }

    fetchCompanyDuplicates();
  }, []);

  // Fetch job duplicates
  useEffect(() => {
    if (jobFetched.current) return;
    jobFetched.current = true;

    async function fetchJobDuplicates() {
      try {
        setJobError(null);
        const res = await fetch("/api/jobs/duplicates");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(data, `Failed to fetch (${res.status})`));
        }
        const data: JobDuplicateGroup[] = await res.json();
        setJobGroups(data);
        // Pre-select the richest job in each group
        const selections: Record<number, string> = {};
        for (let i = 0; i < data.length; i++) {
          const group = data[i];
          const richest = [...group.jobs].sort((a, b) => b.richness - a.richness)[0];
          selections[i] = richest.id;
        }
        setJobSelections(selections);
      } catch (err) {
        setJobError(err instanceof Error ? err.message : "Failed to fetch job duplicates");
      } finally {
        setJobLoading(false);
      }
    }

    fetchJobDuplicates();
  }, []);

  // Merge companies
  async function handleCompanyMerge(group: CompanyDuplicateGroup) {
    const keepId = companySelections[group.normalizedName];
    if (!keepId) return;

    const mergeIds = group.companies
      .filter((c) => c.id !== keepId)
      .map((c) => c.id);

    setCompanyMerging((prev) => ({ ...prev, [group.normalizedName]: true }));
    try {
      const res = await fetch("/api/companies/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(data, `Merge failed (${res.status})`));
      }

      const result = await res.json();
      setCompanySuccess((prev) => ({
        ...prev,
        [group.normalizedName]: `Merged! ${result.jobsMoved} jobs moved, ${result.companiesRemoved} companies removed.`,
      }));
      // Remove group from list
      setCompanyGroups((prev) =>
        prev.filter((g) => g.normalizedName !== group.normalizedName)
      );
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setCompanyMerging((prev) => ({ ...prev, [group.normalizedName]: false }));
    }
  }

  // Merge jobs
  async function handleJobMerge(groupIndex: number, group: JobDuplicateGroup) {
    const keepId = jobSelections[groupIndex];
    if (!keepId) return;

    const deleteIds = group.jobs
      .filter((j) => j.id !== keepId)
      .map((j) => j.id);

    setJobMerging((prev) => ({ ...prev, [groupIndex]: true }));
    try {
      const res = await fetch("/api/jobs/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, deleteIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(data, `Merge failed (${res.status})`));
      }

      const result = await res.json();
      setJobSuccess((prev) => ({
        ...prev,
        [groupIndex]: `Merged! Kept "${result.kept.title}" at ${result.kept.company}, deleted ${result.deleted} duplicate(s).`,
      }));
      // Remove group from list
      setJobGroups((prev) => prev.filter((_, i) => i !== groupIndex));
    } catch (err) {
      setJobError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setJobMerging((prev) => ({ ...prev, [groupIndex]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">De-duplication</h1>
            <p className="text-sm text-gray-500 mt-1">
              Find and merge duplicate companies and jobs
            </p>
          </div>
          <nav className="flex gap-4">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Home
            </Link>
            <Link
              href="/jobs"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Jobs
            </Link>
            <Link
              href="/companies"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Companies
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "companies"}
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "companies"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Companies
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "jobs"}
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "jobs"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Jobs
          </button>
        </div>

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <div className="space-y-4">
            {companyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
                <strong>Error:</strong> {companyError}
              </div>
            )}

            {/* Success messages */}
            {Object.entries(companySuccess).map(([key, msg]) => (
              <div key={key} className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                {msg}
              </div>
            ))}

            {companyLoading ? (
              <p className="text-center text-gray-400 py-12">Loading...</p>
            ) : companyGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No company duplicates found</p>
                <p className="text-gray-400 text-sm mt-1">
                  All company names are unique after normalization.
                </p>
              </div>
            ) : (
              companyGroups.map((group) => (
                <div
                  key={group.normalizedName}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    &ldquo;{group.normalizedName}&rdquo;
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {group.companies.length} variants found. Select which to keep:
                  </p>
                  <div className="space-y-2">
                    {group.companies.map((company) => (
                      <label
                        key={company.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          companySelections[group.normalizedName] === company.id
                            ? "border-purple-300 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`company-${group.normalizedName}`}
                          value={company.id}
                          checked={companySelections[group.normalizedName] === company.id}
                          onChange={() =>
                            setCompanySelections((prev) => ({
                              ...prev,
                              [group.normalizedName]: company.id,
                            }))
                          }
                          className="text-purple-600"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {company.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({company.jobCount} jobs, created{" "}
                            {new Date(company.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                        {group.suggestedKeepId === company.id && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Suggested
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleCompanyMerge(group)}
                      disabled={companyMerging[group.normalizedName]}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {companyMerging[group.normalizedName] ? "Merging..." : "Merge"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {jobError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
                <strong>Error:</strong> {jobError}
              </div>
            )}

            {/* Success messages */}
            {Object.entries(jobSuccess).map(([key, msg]) => (
              <div key={key} className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                {msg}
              </div>
            ))}

            {jobLoading ? (
              <p className="text-center text-gray-400 py-12">Loading...</p>
            ) : jobGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No job duplicates found</p>
                <p className="text-gray-400 text-sm mt-1">
                  All jobs appear to be unique.
                </p>
              </div>
            ) : (
              jobGroups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {group.reason}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {group.jobs.length} potential duplicates. Select which to keep:
                  </p>
                  <div className="space-y-2">
                    {group.jobs.map((job) => {
                      const isRichest =
                        job.richness ===
                        Math.max(...group.jobs.map((j) => j.richness));
                      return (
                        <label
                          key={job.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            jobSelections[groupIndex] === job.id
                              ? "border-purple-300 bg-purple-50"
                              : isRichest
                              ? "border-green-200 bg-green-50/50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`job-${groupIndex}`}
                            value={job.id}
                            checked={jobSelections[groupIndex] === job.id}
                            onChange={() =>
                              setJobSelections((prev) => ({
                                ...prev,
                                [groupIndex]: job.id,
                              }))
                            }
                            className="text-purple-600"
                          />
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-900">
                                {job.title}
                              </span>
                              <br />
                              <span className="text-xs text-gray-500">
                                {job.company}
                              </span>
                            </div>
                            <div className="text-gray-600">
                              <span className="text-xs">Skills: {job.skillCount}</span>
                              <br />
                              <span className="text-xs">
                                Responsibilities: {job.responsibilityCount}
                              </span>
                            </div>
                            <div className="text-gray-600">
                              <span className="text-xs">
                                Desc: {job.descriptionLength} chars
                              </span>
                              <br />
                              <span className="text-xs">
                                Status: {job.status}
                              </span>
                            </div>
                            <div className="text-gray-500 text-xs">
                              {new Date(job.createdAt).toLocaleDateString()}
                              <br />
                              <span className="font-medium">
                                Richness: {job.richness}
                              </span>
                            </div>
                          </div>
                          {isRichest && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Richest
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleJobMerge(groupIndex, group)}
                      disabled={jobMerging[groupIndex]}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {jobMerging[groupIndex] ? "Merging..." : "Merge"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
