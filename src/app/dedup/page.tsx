"use client";

import { useEffect, useState, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";

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
    <div className="min-h-screen bg-paper">
      <Nav title="De-duplication" subtitle="Find and merge duplicate companies and jobs" />

      <main className="max-w-[720px] mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-s-3 border-b border-rule" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "companies"}
            onClick={() => setActiveTab("companies")}
            className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
              activeTab === "companies"
                ? "border-b-2 border-ink text-ink"
                : "text-ink-50"
            }`}
          >
            Companies
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "jobs"}
            onClick={() => setActiveTab("jobs")}
            className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
              activeTab === "jobs"
                ? "border-b-2 border-ink text-ink"
                : "text-ink-50"
            }`}
          >
            Jobs
          </button>
        </div>

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <div className="space-y-4">
            {companyError && (
              <div className="border border-rule p-s-3 text-ink text-body" role="alert">
                <strong>Error:</strong> {companyError}
              </div>
            )}

            {/* Success messages */}
            {Object.entries(companySuccess).map(([key, msg]) => (
              <div key={key} className="border border-rule p-4 text-ink-72 text-sm">
                {msg}
              </div>
            ))}

            {companyLoading ? (
              <p className="text-center text-ink-35 py-12">Loading...</p>
            ) : companyGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-ink-50 text-lg">No company duplicates found</p>
                <p className="text-ink-35 text-sm mt-1">
                  All company names are unique after normalization.
                </p>
              </div>
            ) : (
              companyGroups.map((group) => (
                <div
                  key={group.normalizedName}
                  className="border-t border-rule p-5"
                >
                  <h3 className="text-base font-semibold text-ink mb-3">
                    &ldquo;{group.normalizedName}&rdquo;
                  </h3>
                  <p className="text-sm text-ink-50 mb-4">
                    {group.companies.length} variants found. Select which to keep:
                  </p>
                  <div className="space-y-2">
                    {group.companies.map((company) => (
                      <label
                        key={company.id}
                        className={`flex items-center gap-3 p-3 border cursor-pointer ${
                          companySelections[group.normalizedName] === company.id
                            ? " "
                            : "border-rule hover:border-rule"
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
                          className="text-ink underline"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-ink">
                            {company.name}
                          </span>
                          <span className="text-xs text-ink-50 ml-2">
                            ({company.jobCount} jobs, created{" "}
                            {new Date(company.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                        {group.suggestedKeepId === company.id && (
                          <span className="text-xs font-mono text-meta text-ink-50 px-2 py-0.5">
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
                      className="px-4 py-2 border-[1.5px] border-live text-live bg-transparent text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
              <div className="border border-rule p-s-3 text-ink text-body" role="alert">
                <strong>Error:</strong> {jobError}
              </div>
            )}

            {/* Success messages */}
            {Object.entries(jobSuccess).map(([key, msg]) => (
              <div key={key} className="border border-rule p-4 text-ink-72 text-sm">
                {msg}
              </div>
            ))}

            {jobLoading ? (
              <p className="text-center text-ink-35 py-12">Loading...</p>
            ) : jobGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-ink-50 text-lg">No job duplicates found</p>
                <p className="text-ink-35 text-sm mt-1">
                  All jobs appear to be unique.
                </p>
              </div>
            ) : (
              jobGroups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="border-t border-rule p-5"
                >
                  <h3 className="text-base font-semibold text-ink mb-3">
                    {group.reason}
                  </h3>
                  <p className="text-sm text-ink-50 mb-4">
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
                          className={`flex items-center gap-3 p-3 border cursor-pointer ${
                            jobSelections[groupIndex] === job.id
                              ? " "
                              : isRichest
                              ? "border-rule "
                              : "border-rule hover:border-rule"
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
                            className="text-ink underline"
                          />
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="font-medium text-ink">
                                {job.title}
                              </span>
                              <br />
                              <span className="text-xs text-ink-50">
                                {job.company}
                              </span>
                            </div>
                            <div className="text-ink-72">
                              <span className="text-xs">Skills: {job.skillCount}</span>
                              <br />
                              <span className="text-xs">
                                Responsibilities: {job.responsibilityCount}
                              </span>
                            </div>
                            <div className="text-ink-72">
                              <span className="text-xs">
                                Desc: {job.descriptionLength} chars
                              </span>
                              <br />
                              <span className="text-xs">
                                Status: {job.status}
                              </span>
                            </div>
                            <div className="text-ink-50 text-xs">
                              {new Date(job.createdAt).toLocaleDateString()}
                              <br />
                              <span className="font-medium">
                                Richness: {job.richness}
                              </span>
                            </div>
                          </div>
                          {isRichest && (
                            <span className="text-xs font-mono text-meta text-ink-50 px-2 py-0.5 whitespace-nowrap">
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
                      className="px-4 py-2 border-[1.5px] border-live text-live bg-transparent text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
