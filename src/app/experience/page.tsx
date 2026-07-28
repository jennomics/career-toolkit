"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import ExperienceCard from "@/components/ExperienceCard";
import ExperienceForm from "@/components/ExperienceForm";
import ResumeUpload from "@/components/ResumeUpload";
import MergeExperience from "@/components/MergeExperience";

interface Highlight {
  id: string;
  text: string;
  category: string;
  metrics: string | null;
  keywords: string[];
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string;
  industry: string | null;
  department: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: string;
  skills: { id: string; name: string }[];
  highlights: Highlight[];
}

interface FormData {
  id?: string;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  industry: string;
  department: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  skills: string[];
  highlights: { text: string; category: string; metrics: string; keywords: string[] }[];
}

function formatDateForInput(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function ExperiencePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState<FormData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [showMergeEditor, setShowMergeEditor] = useState(false);

  const [needsSetup, setNeedsSetup] = useState(false);

  const fetchExperiences = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/experience");
      if (res.ok) {
        const data = await res.json();
        setExperiences(data);
        // Check if the API signaled that the table doesn't exist
        if (res.headers.get("X-Setup-Required") === "prisma-db-push") {
          setNeedsSetup(true);
        }
      } else if (res.status === 503) {
        // Table doesn't exist yet
        setNeedsSetup(true);
        setExperiences([]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to load experience (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchExperiences();
    }
  }, [fetchExperiences]);

  // Client-side search
  const filteredExperiences = useMemo(() => {
    if (!searchQuery) return experiences;
    const q = searchQuery.toLowerCase();
    return experiences.filter(
      (exp) =>
        exp.title.toLowerCase().includes(q) ||
        exp.company.toLowerCase().includes(q) ||
        (exp.location && exp.location.toLowerCase().includes(q)) ||
        (exp.description && exp.description.toLowerCase().includes(q)) ||
        (exp.industry && exp.industry.toLowerCase().includes(q)) ||
        (exp.department && exp.department.toLowerCase().includes(q)) ||
        exp.skills.some((s) => s.name.toLowerCase().includes(q)) ||
        exp.highlights.some((h) => h.text.toLowerCase().includes(q))
    );
  }, [experiences, searchQuery]);

  // Stats
  const totalYears = useMemo(() => {
    let totalMonths = 0;
    for (const exp of experiences) {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    }
    return Math.round(totalMonths / 12);
  }, [experiences]);

  const uniqueSkills = useMemo(() => {
    const set = new Set<string>();
    for (const exp of experiences) {
      for (const skill of exp.skills) {
        set.add(skill.name.toLowerCase());
      }
    }
    return set.size;
  }, [experiences]);

  const handleEdit = (experience: Experience) => {
    const formData: FormData = {
      id: experience.id,
      title: experience.title,
      company: experience.company,
      location: experience.location || "",
      employmentType: experience.employmentType,
      industry: experience.industry || "",
      department: experience.department || "",
      startDate: formatDateForInput(experience.startDate),
      endDate: experience.endDate ? formatDateForInput(experience.endDate) : "",
      isCurrent: experience.isCurrent,
      description: experience.description || "",
      skills: experience.skills.map((s) => s.name),
      highlights: experience.highlights.map((h) => ({
        text: h.text,
        category: h.category,
        metrics: h.metrics || "",
        keywords: h.keywords,
      })),
    };
    setEditingData(formData);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingData(undefined);
    fetchExperiences();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingData(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Experience</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your work history — used for resume building and job matching
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              &larr; Job Library
            </Link>
            <Link
              href="/resume"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Resume Builder &rarr;
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Database setup needed */}
        {needsSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5" role="alert">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">Database Setup Required</h3>
            <p className="text-sm text-amber-700 mb-3">
              The Experience tables haven&apos;t been created in your database yet. Run this command in your career-toolkit directory:
            </p>
            <code className="block bg-amber-100 text-amber-900 px-3 py-2 rounded text-sm font-mono">
              npx prisma db push
            </code>
            <p className="text-xs text-amber-600 mt-2">
              This only needs to be done once. After that, this page will work normally.
            </p>
          </div>
        )}

        {/* Stats bar */}
        {experiences.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>
                <strong className="text-gray-900">{experiences.length}</strong>{" "}
                {experiences.length === 1 ? "role" : "roles"}
              </span>
              <span>
                <strong className="text-gray-900">{totalYears}</strong>{" "}
                {totalYears === 1 ? "year" : "years"} total experience
              </span>
              <span>
                <strong className="text-gray-900">{uniqueSkills}</strong> unique skills
              </span>
            </div>
            <button
              onClick={() => {
                setMergeMode(!mergeMode);
                setSelectedForMerge(new Set());
                setShowMergeEditor(false);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                mergeMode
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {mergeMode ? "Exit Merge Mode" : "Merge Roles"}
            </button>
          </div>
        )}

        {/* Merge mode toolbar */}
        {mergeMode && selectedForMerge.size >= 2 && !showMergeEditor && (
          <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-sm text-purple-700">
              <strong>{selectedForMerge.size}</strong> roles selected for merge
            </span>
            <button
              onClick={() => setShowMergeEditor(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-purple-700"
            >
              Merge Selected
            </button>
          </div>
        )}

        {mergeMode && selectedForMerge.size < 2 && (
          <p className="text-sm text-purple-500 bg-purple-50 border border-purple-100 rounded-lg p-3">
            Select 2 or more roles to merge them. Click the checkboxes below.
          </p>
        )}

        {/* Search */}
        {experiences.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experience by title, company, skill..."
              className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              aria-label="Search experience"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {filteredExperiences.length} of {experiences.length}
              </span>
            )}
          </div>
        )}

        {/* Upload Resume / Add Form */}
        <ResumeUpload onSaved={fetchExperiences} />

        {showForm ? (
          <ExperienceForm
            initialData={editingData}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <button
            onClick={() => {
              setEditingData(undefined);
              setShowForm(true);
            }}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
          >
            + Add Experience Manually
          </button>
        )}

        {/* Merge Editor */}
        {showMergeEditor && (
          <MergeExperience
            experiences={experiences.filter((e) => selectedForMerge.has(e.id))}
            onMerged={() => {
              setShowMergeEditor(false);
              setMergeMode(false);
              setSelectedForMerge(new Set());
              fetchExperiences();
            }}
            onCancel={() => setShowMergeEditor(false)}
          />
        )}

        {/* Experience List */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : filteredExperiences.length === 0 && experiences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No experience added yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Add your work history above. Your experience will be used to match against job
              postings and build tailored resumes.
            </p>
          </div>
        ) : filteredExperiences.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">
              No experience matches &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExperiences.map((exp) => (
              <div key={exp.id} className="flex gap-3 items-start">
                {mergeMode && (
                  <input
                    type="checkbox"
                    checked={selectedForMerge.has(exp.id)}
                    onChange={() => {
                      setSelectedForMerge((prev) => {
                        const next = new Set(prev);
                        if (next.has(exp.id)) {
                          next.delete(exp.id);
                        } else {
                          next.add(exp.id);
                        }
                        return next;
                      });
                    }}
                    className="mt-5 h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 shrink-0 cursor-pointer"
                    aria-label={`Select ${exp.title} at ${exp.company} for merge`}
                  />
                )}
                <div className="flex-1">
                  <ExperienceCard
                    experience={exp}
                    onEdit={handleEdit}
                    onDelete={fetchExperiences}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
