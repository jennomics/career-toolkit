"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/extract-error-message";
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <Link href="/companies" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              &larr; Back to Companies
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        </main>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/companies" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              &larr; Companies
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <button
              onClick={toggleDreamCompany}
              disabled={togglingDream}
              className={`text-2xl cursor-pointer transition-colors ${
                dreamCompany ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
              }`}
              title={dreamCompany ? "Dream Company (click to remove)" : "Mark as Dream Company"}
            >
              &#9733;
            </button>
          </div>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Home
            </Link>
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Jobs
            </Link>
            <Link href="/skills" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Skills
            </Link>
            <Link href="/resume" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Resume
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Company Intelligence */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full px-6 py-4 flex items-center justify-between cursor-pointer"
          >
            <h2 className="text-sm font-semibold text-gray-900">Company Intelligence</h2>
            <span className="text-gray-400 text-sm">{notesOpen ? "▼" : "▶"}</span>
          </button>
          {notesOpen && (
            <div className="px-6 pb-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Add notes about this company - culture, interview process, key contacts, strategy... This information will be used by the AI when generating resumes for this company's jobs."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              />
              {savingNotes && (
                <p className="text-xs text-gray-400 mt-1">Saving...</p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-lg p-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
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
