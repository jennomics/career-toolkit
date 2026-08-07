"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import ExperienceCard from "@/components/ExperienceCard";
import ExperienceForm from "@/components/ExperienceForm";
import ResumeUpload from "@/components/ResumeUpload";
import MergeExperience from "@/components/MergeExperience";
import Nav from "@/components/Nav";

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
        setError(extractErrorMessage(errData, `Failed to load experience (${res.status})`));
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
    let result = experiences;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
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
    }
    // Sort: current roles first, then by start date newest first
    return [...result].sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
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
    // Scroll to form
    setTimeout(() => {
      document.getElementById("experience-form-area")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
    <div className="min-h-screen bg-paper">
      <Nav title="My Experience" subtitle="Your work history, used for resume building and job matching" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-4">
        {/* Error */}
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
          </div>
        )}

        {/* Database setup needed */}
        {needsSetup && (
          <div className="border border-rule p-s-3" role="alert">
            <h3 className="font-mono text-meta text-ink-50 uppercase tracking-widest mb-s-1">Database setup required</h3>
            <p className="text-body text-ink-72 mb-s-2">
              The Experience tables haven&apos;t been created in your database yet. Run this command in your career-toolkit directory:
            </p>
            <code className="block font-mono text-body text-ink px-s-2 py-s-1 border-b border-rule">
              npx prisma migrate dev
            </code>
            <p className="font-mono text-meta text-ink-35 mt-s-2">
              This only needs to be done once. After that, this page will work normally.
            </p>
          </div>
        )}

        {/* Stats bar */}
        {experiences.length > 0 && (
          <div className="flex items-center justify-between border-t border-rule pt-s-2">
            <div className="flex items-center gap-s-3 text-body text-ink-72">
              <span>
                <span className="font-mono text-ink">{experiences.length}</span>{" "}
                {experiences.length === 1 ? "role" : "roles"}
              </span>
              <span>
                <span className="font-mono text-ink">{totalYears}</span>{" "}
                {totalYears === 1 ? "year" : "years"} total experience
              </span>
              <span>
                <span className="font-mono text-ink">{uniqueSkills}</span> unique skills
              </span>
            </div>
            <button
              onClick={() => {
                setMergeMode(!mergeMode);
                setSelectedForMerge(new Set());
                setShowMergeEditor(false);
              }}
              className={`px-s-2 min-h-[44px] text-body font-medium cursor-pointer ${
                mergeMode
                  ? "border-b-2 border-ink text-ink"
                  : "text-ink-50"
              }`}
            >
              {mergeMode ? "Exit merge mode" : "Merge roles"}
            </button>
          </div>
        )}

        {/* Merge mode toolbar */}
        {mergeMode && selectedForMerge.size >= 2 && !showMergeEditor && (
          <div className="flex items-center justify-between p-s-2 border border-rule">
            <span className="text-body text-ink-72">
              <span className="font-mono text-ink">{selectedForMerge.size}</span> roles selected for merge
            </span>
            <button
              onClick={() => setShowMergeEditor(true)}
              className="px-s-3 h-[48px] border-[1.5px] border-live text-live text-body font-medium cursor-pointer"
            >
              Merge selected
            </button>
          </div>
        )}

        {mergeMode && selectedForMerge.size < 2 && (
          <p className="text-body text-ink-50 border border-rule p-s-2">
            Select 2 or more roles to merge them. Click the checkboxes below.
          </p>
        )}

        {/* Search - underline field */}
        {experiences.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experience by title, company, skill..."
              className="w-full px-0 py-s-2 border-0 border-b border-rule bg-transparent focus:outline-none focus:border-ink text-body text-ink placeholder:text-ink-35"
              aria-label="Search experience"
            />
            {searchQuery && (
              <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-meta text-ink-35">
                {filteredExperiences.length} of {experiences.length}
              </span>
            )}
          </div>
        )}

        {/* Upload Resume / Add Form */}
        <ResumeUpload onSaved={fetchExperiences} />

        <div id="experience-form-area">
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
              className="w-full p-s-3 border border-dashed border-rule text-ink-50 cursor-pointer text-body min-h-[48px]"
            >
              + Add experience manually
            </button>
          )}
        </div>

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
          <p className="text-center text-ink-35 py-s-5">Loading...</p>
        ) : filteredExperiences.length === 0 && experiences.length === 0 ? (
          <div className="text-center py-s-5">
            <p className="text-ink-50 text-h3 font-zen">No experience added yet</p>
            <p className="text-ink-35 text-body mt-s-1">
              Add your work history above. Your experience will be used to match against job
              postings and build tailored resumes.
            </p>
          </div>
        ) : filteredExperiences.length === 0 ? (
          <div className="text-center py-s-4">
            <p className="text-ink-35 text-body">
              No experience matches &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-body text-ink underline mt-s-2 cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filteredExperiences.map((exp) => (
              <div key={exp.id} className="flex gap-s-2 items-start py-s-2">
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
                    className="mt-5 h-5 w-5 border-rule shrink-0 cursor-pointer"
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
