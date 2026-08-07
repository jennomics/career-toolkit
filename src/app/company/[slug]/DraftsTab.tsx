"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { CompanyJob } from "./page";

interface DraftsTabProps {
  companySlug: string;
  jobs: CompanyJob[];
}

interface ResumeProjectItem {
  id: string;
  jobId: string;
  status: string;
  step: number;
  createdAt: string;
  updatedAt: string;
}

export default function DraftsTab({ companySlug, jobs }: DraftsTabProps) {
  const [drafts, setDrafts] = useState<ResumeProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchDrafts() {
      try {
        const res = await fetch(`/api/resume/projects?companySlug=${companySlug}`);
        if (res.ok) {
          const data = await res.json();
          setDrafts(data);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(extractErrorMessage(errData, "Failed to load drafts"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load drafts");
      } finally {
        setLoading(false);
      }
    }

    fetchDrafts();
  }, [companySlug]);

  function getJobTitle(jobId: string): string {
    const job = jobs.find((j) => j.id === jobId);
    return job ? job.title : "Unknown Job";
  }

  if (loading) {
    return <p className="text-center text-ink-35 py-8">Loading drafts...</p>;
  }

  if (error) {
    return (
      <div className="border border-rule p-s-3 text-ink text-body">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="border-t border-rule pt-s-4 text-center">
        <p className="text-ink-50">No resume drafts yet.</p>
        <p className="text-xs text-ink-35 mt-1">
          Use the Resume tab to generate one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="border-t border-rule pt-s-3 flex items-center justify-between"
        >
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {getJobTitle(draft.jobId)}
            </h3>
            <p className="text-xs text-ink-50 mt-1">
              Status: <span className="capitalize">{draft.status}</span> &middot; Step {draft.step}/4 &middot; Updated {new Date(draft.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <Link
            href="/resume"
            className="text-sm text-ink underline font-medium"
          >
            Continue &rarr;
          </Link>
        </div>
      ))}
    </div>
  );
}
