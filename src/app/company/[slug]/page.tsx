"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";
import JobsTab from "./JobsTab";
import SkillsTab from "./SkillsTab";
import PhrasesTab from "./PhrasesTab";
import ResumeTab from "./ResumeTab";
import DraftsTab from "./DraftsTab";
import ApplicationsTab from "./ApplicationsTab";
import NetworkingTab from "./NetworkingTab";

interface JobSkill {
  id: string;
  name: string;
  normalizedName: string | null;
  category: string | null;
}

interface JobResponsibility {
  id: string;
  text: string;
  category: string;
  keywords: string[];
}

export interface CompanyJob {
  id: string;
  title: string;
  company: string;
  status: string;
  dreamJob: boolean;
  createdAt: string;
  updatedAt: string;
  description: string;
  skills: JobSkill[];
  responsibilities: JobResponsibility[];
}

export interface SkillBreakdown {
  name: string;
  normalizedName: string | null;
  category: string | null;
  count: number;
}

export interface CompanyData {
  id: string;
  name: string;
  slug: string;
  notes: string | null;
  dreamCompany: boolean;
  createdAt: string;
  updatedAt: string;
  jobs: CompanyJob[];
  skillsBreakdown: SkillBreakdown[];
}

type TabName = "jobs" | "skills" | "phrases" | "resume" | "drafts" | "applications" | "networking";

export default function CompanyDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("jobs");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [dreamCompany, setDreamCompany] = useState(false);
  const [togglingDream, setTogglingDream] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const fetchCompany = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/companies/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setNotes(data.notes || "");
        setDreamCompany(data.dreamCompany);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, `Failed to load company (${res.status})`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCompany();
    }
  }, [fetchCompany]);

  async function saveNotes() {
    if (!company) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/companies/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(extractErrorMessage(data, "Failed to save notes"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function toggleDreamCompany() {
    if (!company) return;
    setTogglingDream(true);
    const newValue = !dreamCompany;
    try {
      const res = await fetch(`/api/companies/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamCompany: newValue }),
      });
      if (res.ok) {
        setDreamCompany(newValue);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(extractErrorMessage(data, "Failed to update"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setTogglingDream(false);
    }
  }

  const tabs: { key: TabName; label: string }[] = [
    { key: "jobs", label: "Jobs" },
    { key: "skills", label: "Skills" },
    { key: "phrases", label: "Phrases" },
    { key: "resume", label: "Resume" },
    { key: "drafts", label: "Drafts" },
    { key: "applications", label: "Applications" },
    { key: "networking", label: "Networking" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-35">Loading...</p>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav title="Company" />
        <main className="max-w-[720px] mx-auto px-6 py-8">
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            <strong>Error:</strong> {error}
          </div>
        </main>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-paper">
      <Nav title={company.name} />

      <main className="max-w-[720px] mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-s-3">
          <Link href="/companies" className="text-body text-ink underline">
            Companies
          </Link>
          <button
            onClick={toggleDreamCompany}
            disabled={togglingDream}
            className={`text-2xl cursor-pointer ${
              dreamCompany ? "text-ink" : "text-ink-35"
            }`}
            title={dreamCompany ? "Dream Company (click to remove)" : "Mark as Dream Company"}
          >
            &#9733;
          </button>
        </div>
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Company Intelligence */}
        <div className="border-t border-rule">
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full py-s-3 flex items-center justify-between cursor-pointer min-h-[44px]"
          >
            <h2 className="text-body font-medium text-ink">Company intelligence</h2>
            <span className="text-ink-35 text-body">{notesOpen ? "v" : ">"}</span>
          </button>
          {notesOpen && (
            <div className="pb-s-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Add notes about this company - culture, interview process, key contacts, strategy..."
                className="w-full h-32 px-0 py-s-2 border-0 border-b border-rule bg-transparent text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink resize-y"
              />
              {savingNotes && (
                <p className="font-mono text-meta text-ink-35 mt-s-1">Saving...</p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-s-3 border-b border-rule" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-s-2 text-body font-medium cursor-pointer min-h-[44px] ${
                activeTab === tab.key
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "jobs" && <JobsTab jobs={company.jobs} onUpdate={fetchCompany} />}
          {activeTab === "skills" && <SkillsTab skillsBreakdown={company.skillsBreakdown} />}
          {activeTab === "phrases" && <PhrasesTab jobs={company.jobs} />}
          {activeTab === "resume" && <ResumeTab company={company} />}
          {activeTab === "drafts" && <DraftsTab companySlug={company.slug} jobs={company.jobs} />}
          {activeTab === "applications" && <ApplicationsTab jobs={company.jobs} />}
          {activeTab === "networking" && <NetworkingTab />}
        </div>
      </main>
    </div>
  );
}
