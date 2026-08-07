"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  status: string;
  createdAt: string;
  skills: { id: string; name: string }[];
}

interface GapResult {
  jdKeywordsFound: number;
  coverage: number;
  matched: { keyword: string; strength: string; jobCount: number }[];
  gaps: string[];
  relevantPhrases: { id: string; text: string; category: string; jobTitle: string; company: string }[];
}

interface GapItem {
  keyword: string;
  status: "gap" | "filled" | "real-gap";
}

interface ExperienceRole {
  id: string;
  title: string;
  company: string;
}


interface RecommendedHighlight {
  text: string;
  reason: string;
  fromHighlightId?: string;
  selected: boolean;
  edited?: string;
  improved?: string;
  improvementExplanation?: string;
  showImproved?: boolean;
}

interface RoleBuild {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  recommendedHighlights: RecommendedHighlight[];
  allHighlights: { id: string; text: string; category: string; metrics: string | null }[];
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Component ──────────────────────────────────────────────────────────────

export default function ResumeBuildPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Step 1: Job selection
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobSearch, setJobSearch] = useState("");


  // Step 2: Gap analysis
  const [gapResult, setGapResult] = useState<GapResult | null>(null);
  const [gapLoading, setGapLoading] = useState(false);

  // Step 3: Fill gaps
  const [gapItems, setGapItems] = useState<GapItem[]>([]);
  const [fillFormOpen, setFillFormOpen] = useState<string | null>(null);
  const [experienceRoles, setExperienceRoles] = useState<ExperienceRole[]>([]);
  const [fillHighlightText, setFillHighlightText] = useState("");
  const [fillSelectedRoles, setFillSelectedRoles] = useState<string[]>([]);

  // Step 4: Build resume
  const [roleBuild, setRoleBuild] = useState<RoleBuild[]>([]);
  const [buildLoading, setBuildLoading] = useState(false);
  const [improvingIdx, setImprovingIdx] = useState<{ role: number; highlight: number } | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftResume, setDraftResume] = useState<string | null>(null);

  // Step 5: Cover letter
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // Step 6: Export
  const [isExporting, setIsExporting] = useState(false);

  // General
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // ─── Fetch jobs on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setJobs(data))
      .finally(() => setJobsLoading(false));
  }, []);

  // Filtered jobs for search
  const filteredJobs = jobSearch
    ? jobs.filter((j) => {
        const q = jobSearch.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skills.some((s) => s.name.toLowerCase().includes(q))
        );
      })
    : jobs;


  // ─── Step 1 → 2: Create project and run gap analysis ─────────────────────────
  const handleSelectJob = async () => {
    if (!selectedJobId) return;
    setError(null);
    setGapLoading(true);
    setStep(2);

    try {
      // Create project
      const projRes = await fetch("/api/resume/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      });
      if (projRes.ok) {
        const proj = await projRes.json();
        setProjectId(proj.id);
      }

      // Run gap analysis
      const job = jobs.find((j) => j.id === selectedJobId);
      if (!job) throw new Error("Job not found");

      const gapRes = await fetch("/api/resume/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: job.description }),
      });

      if (gapRes.ok) {
        const data = await gapRes.json();
        setGapResult(data);
        // Prepare gap items for step 3
        setGapItems(data.gaps.map((g: string) => ({ keyword: g, status: "gap" as const })));
      } else {
        const data = await gapRes.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : data.error?.message || "Gap analysis failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setGapLoading(false);
    }
  };


  // ─── Step 3: Fill gaps helpers ────────────────────────────────────────────────
  const handleMarkRealGap = (keyword: string) => {
    setGapItems((prev) =>
      prev.map((g) => (g.keyword === keyword ? { ...g, status: "real-gap" } : g))
    );
  };

  const handleOpenFillForm = async (keyword: string) => {
    setFillFormOpen(keyword);
    setFillHighlightText("");
    setFillSelectedRoles([]);
    // Fetch experience roles if not loaded
    if (experienceRoles.length === 0) {
      try {
        const res = await fetch("/api/experience");
        if (res.ok) {
          const data = await res.json();
          setExperienceRoles(data.map((e: { id: string; title: string; company: string }) => ({
            id: e.id, title: e.title, company: e.company,
          })));
        }
      } catch { /* ignore */ }
    }
  };

  const handleSaveFillGap = async () => {
    if (!fillHighlightText.trim() || fillSelectedRoles.length === 0) return;
    setError(null);

    // Add highlight to each selected role
    for (const roleId of fillSelectedRoles) {
      try {
        const res = await fetch(`/api/experience/${roleId}`, { method: "GET" });
        if (!res.ok) continue;
        const role = await res.json();
        const existingHighlights = (role.highlights || []).map((h: { text: string; category: string; metrics: string | null; keywords: string[] }) => ({
          text: h.text, category: h.category, metrics: h.metrics || "", keywords: h.keywords || [],
        }));

        await fetch(`/api/experience/${roleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            highlights: [
              ...existingHighlights,
              { text: fillHighlightText.trim(), category: "achievement", metrics: "", keywords: [fillFormOpen || ""] },
            ],
          }),
        });
      } catch { /* continue */ }
    }

    // Mark as filled
    if (fillFormOpen) {
      setGapItems((prev) =>
        prev.map((g) => (g.keyword === fillFormOpen ? { ...g, status: "filled" } : g))
      );
    }
    setFillFormOpen(null);
  };


  // ─── Step 3 → 4: Build resume ────────────────────────────────────────────────
  const handleBuildResume = async () => {
    if (!projectId) return;
    setError(null);
    setBuildLoading(true);
    setStep(4);

    try {
      const res = await fetch(`/api/resume/project/${projectId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        const roles: RoleBuild[] = (data.roles || []).map((r: {
          id: string; title: string; company: string; startDate: string; endDate: string | null; isCurrent: boolean;
          recommendedHighlights: { text: string; reason: string; fromHighlightId?: string }[];
          allHighlights: { id: string; text: string; category: string; metrics: string | null }[];
        }) => ({
          ...r,
          recommendedHighlights: r.recommendedHighlights.map((h) => ({
            ...h, selected: true,
          })),
        }));
        // Sort newest first
        roles.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setRoleBuild(roles);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : data.error?.message || "Build failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build resume");
    } finally {
      setBuildLoading(false);
    }
  };


  // ─── Step 4: Improve a bullet ─────────────────────────────────────────────────
  const handleImprove = async (roleIdx: number, highlightIdx: number) => {
    setImprovingIdx({ role: roleIdx, highlight: highlightIdx });
    const role = roleBuild[roleIdx];
    const highlight = role.recommendedHighlights[highlightIdx];
    const job = jobs.find((j) => j.id === selectedJobId);

    try {
      const res = await fetch(`/api/resume/project/${projectId}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullet: highlight.edited || highlight.text,
          jobTitle: job?.title || "",
          jobDescription: job?.description || "",
          roleTitle: role.title,
          company: role.company,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoleBuild((prev) => prev.map((r, ri) =>
          ri === roleIdx ? {
            ...r,
            recommendedHighlights: r.recommendedHighlights.map((h, hi) =>
              hi === highlightIdx ? { ...h, improved: data.improved, improvementExplanation: data.explanation, showImproved: true } : h
            ),
          } : r
        ));
      }
    } catch { /* ignore */ }
    setImprovingIdx(null);
  };

  const handleAcceptImproved = (roleIdx: number, highlightIdx: number) => {
    setRoleBuild((prev) => prev.map((r, ri) =>
      ri === roleIdx ? {
        ...r,
        recommendedHighlights: r.recommendedHighlights.map((h, hi) =>
          hi === highlightIdx ? { ...h, edited: h.improved, showImproved: false } : h
        ),
      } : r
    ));
  };

  const handleKeepOriginal = (roleIdx: number, highlightIdx: number) => {
    setRoleBuild((prev) => prev.map((r, ri) =>
      ri === roleIdx ? {
        ...r,
        recommendedHighlights: r.recommendedHighlights.map((h, hi) =>
          hi === highlightIdx ? { ...h, showImproved: false } : h
        ),
      } : r
    ));
  };

  const handleKeepBoth = (roleIdx: number, highlightIdx: number) => {
    setRoleBuild((prev) => prev.map((r, ri) => {
      if (ri !== roleIdx) return r;
      const h = r.recommendedHighlights[highlightIdx];
      if (!h.improved) return r;
      // Insert the improved version as a new highlight after the current one
      const newHighlights = [...r.recommendedHighlights];
      newHighlights.splice(highlightIdx + 1, 0, {
        text: h.improved,
        reason: "Improved version",
        selected: true,
        showImproved: false,
      });
      newHighlights[highlightIdx] = { ...h, showImproved: false };
      return { ...r, recommendedHighlights: newHighlights };
    }));
  };

  // ─── Generate draft resume from selected highlights ────────────────────────
  const handleGenerateDraft = async () => {
    setIsGeneratingDraft(true);
    setDraftResume(null);
    setError(null);

    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    // Build structured content from selections
    const resumeRoles = roleBuild
      .filter((r) => r.recommendedHighlights.some((h) => h.selected))
      .map((r) => ({
        title: r.title,
        company: r.company,
        startDate: r.startDate,
        endDate: r.endDate,
        isCurrent: r.isCurrent,
        bullets: r.recommendedHighlights
          .filter((h) => h.selected)
          .map((h) => h.edited || h.text),
      }));

    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: job.title,
          selectedRoles: resumeRoles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Format as readable text
        const lines: string[] = [];
        lines.push(data.targetRole || job.title);
        lines.push("");
        if (data.summary) {
          lines.push("PROFESSIONAL SUMMARY");
          lines.push(data.summary);
          lines.push("");
        }
        lines.push("EXPERIENCE");
        lines.push("");
        for (const role of resumeRoles) {
          const dateRange = `${formatDate(role.startDate)} - ${role.isCurrent ? "Present" : formatDate(role.endDate)}`;
          lines.push(`${role.title} | ${role.company} | ${dateRange}`);
          for (const bullet of role.bullets) {
            lines.push(`  \u2022 ${bullet}`);
          }
          lines.push("");
        }
        if (data.keySkills && data.keySkills.length > 0) {
          lines.push("SKILLS");
          lines.push(data.keySkills.join(" | "));
          lines.push("");
        }
        setDraftResume(lines.join("\n"));

        // Autosave to project
        if (projectId) {
          try {
            await fetch(`/api/resume/project/${projectId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resumeMarkdown: lines.join("\n"),
                resumeContent: { summary: data.summary, keySkills: data.keySkills, roles: resumeRoles },
                selectedHighlights: roleBuild.map((r) => ({
                  roleId: r.id,
                  highlights: r.recommendedHighlights.filter((h) => h.selected).map((h) => ({ text: h.edited || h.text })),
                })),
                step: 4,
                status: "in-progress",
              }),
            });
          } catch { /* autosave failure is non-critical */ }
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : data.error?.message || "Failed to generate resume draft");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // ─── Step 5: Generate cover letter ────────────────────────────────────────────
  const handleGenerateCover = async () => {
    setIsGeneratingCover(true);
    setCoverLetter(null);
    setError(null);

    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) {
      setError("Could not find selected job");
      setIsGeneratingCover(false);
      return;
    }

    if (!projectId) {
      setError("No project ID — try restarting the workflow");
      setIsGeneratingCover(false);
      return;
    }

    try {
      const res = await fetch(`/api/resume/project/${projectId}/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description.slice(0, 2000),
          resumeDraft: draftResume?.slice(0, 3000) || "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCoverLetter(data.coverLetter || "");
        setStep(5);

        // Autosave
        try {
          await fetch(`/api/resume/project/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coverLetterContent: data.coverLetter, step: 5 }),
          });
        } catch { /* non-critical */ }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : data.error?.message || "Failed to generate cover letter");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // ─── Step 6: Export PDF ───────────────────────────────────────────────────────
  const handleExportPDF = async (type: "resume" | "cover-letter") => {
    setIsExporting(true);
    try {
      const content = type === "resume" ? draftResume : coverLetter;
      if (!content) return;

      const job = jobs.find((j) => j.id === selectedJobId);
      const filename = type === "resume"
        ? `Resume_${job?.company || "Draft"}_${job?.title || ""}.html`.replace(/\s+/g, "_")
        : `CoverLetter_${job?.company || "Draft"}.html`.replace(/\s+/g, "_");

      const res = await fetch("/api/resume/project/" + projectId + "/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type, filename }),
      });

      if (res.ok) {
        const html = await res.text();
        // Open in new tab for print-to-PDF
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        // Mark as complete
        if (projectId) {
          try {
            await fetch(`/api/resume/project/${projectId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "complete", step: 6 }),
            });
          } catch { /* non-critical */ }
        }
      } else {
        setError("Export failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };


  const handleToggleHighlight = (roleIdx: number, highlightIdx: number) => {
    setRoleBuild((prev) => prev.map((r, ri) =>
      ri === roleIdx ? {
        ...r,
        recommendedHighlights: r.recommendedHighlights.map((h, hi) =>
          hi === highlightIdx ? { ...h, selected: !h.selected } : h
        ),
      } : r
    ));
  };

  const handleEditHighlight = (roleIdx: number, highlightIdx: number, text: string) => {
    setRoleBuild((prev) => prev.map((r, ri) =>
      ri === roleIdx ? {
        ...r,
        recommendedHighlights: r.recommendedHighlights.map((h, hi) =>
          hi === highlightIdx ? { ...h, edited: text } : h
        ),
      } : r
    ));
  };

  const handleAddHighlight = (roleIdx: number, text: string) => {
    if (!text.trim()) return;
    setRoleBuild((prev) => prev.map((r, ri) =>
      ri === roleIdx ? {
        ...r,
        recommendedHighlights: [...r.recommendedHighlights, { text: text.trim(), reason: "Manually added", selected: true }],
      } : r
    ));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Present";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };


  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Resume Builder" subtitle="Guided workflow: Job, Gap Analysis, Fill Gaps, Build" />

      {/* Step indicator */}
      <div className="max-w-[720px] mx-auto px-6 pt-s-3">
        <div className="flex items-center gap-s-2 font-mono text-meta">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`flex items-center gap-1 ${step >= s ? "text-ink" : "text-ink-35"}`}>
              <span className={`w-6 h-6 flex items-center justify-center text-meta border ${
                step > s ? "border-ink text-ink" : step === s ? "border-ink text-ink font-medium" : "border-rule text-ink-35"
              }`}>{step > s ? "\u2713" : s}</span>
              <span className="hidden sm:inline uppercase tracking-widest">{["Select Job", "Gap Analysis", "Fill Gaps", "Build Resume", "Cover Letter", "Export"][s - 1]}</span>
              {s < 6 && <span className="mx-1 text-ink-35">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-[720px] mx-auto px-6 py-s-3 space-y-s-4">
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
            {error.includes("unresolved profile item") && (
              <span className="ml-2">
                <Link href="/profile" className="text-ink underline font-medium">
                  Resolve items on your Profile page
                </Link>
              </span>
            )}
          </div>
        )}


        {/* ═══ STEP 1: Select Job ═══ */}
        {step === 1 && (
          <div className="border-t border-rule pt-s-3">
            <h2 className="text-h3 font-zen font-medium text-ink mb-s-2">1. Select a job to target</h2>
            <p className="text-body text-ink-50 mb-s-3">Choose a job from your library. The resume will be tailored to this specific role.</p>

            {jobsLoading ? (
              <p className="text-body text-ink-35 py-s-3">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-body text-ink-50">No jobs saved. <Link href="/jobs" className="text-ink underline">Add some first</Link>.</p>
            ) : (
              <>
                {/* Search */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Search by title, company, or skill..."
                    className="w-full px-4 py-2 pl-9 border border-rule text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                    aria-label="Search jobs"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-35" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Job list */}
                <div className="space-y-2 max-h-80 overflow-y-auto border border-rule p-2">
                  {filteredJobs.length === 0 ? (
                    <p className="text-sm text-ink-35 p-3">No jobs match &ldquo;{jobSearch}&rdquo;</p>
                  ) : (
                    filteredJobs.map((job) => (
                      <label key={job.id} className={`flex items-center gap-3 p-3 cursor-pointer ${
                        selectedJobId === job.id ? " border " : "hover:bg-paper border border-transparent"
                      }`}>
                        <input type="radio" name="target-job" value={job.id} checked={selectedJobId === job.id}
                          onChange={() => setSelectedJobId(job.id)} className="h-4 w-4 text-ink underline border-rule" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{job.title}</p>
                          <p className="text-xs text-ink-50">{job.company} &middot; {job.skills.length} skills &middot; {new Date(job.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 capitalize shrink-0 font-mono text-meta text-ink-50`}>{job.status}</span>
                      </label>
                    ))
                  )}
                </div>
                {jobSearch && (
                  <p className="text-xs text-ink-35 mt-1">{filteredJobs.length} of {jobs.length} jobs</p>
                )}
              </>
            )}

            <div className="mt-4">
              <button onClick={handleSelectJob} disabled={!selectedJobId}
                className="px-5 py-2 border-[1.5px] border-live text-live bg-transparent text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                Next: Run Gap Analysis &rarr;
              </button>
            </div>
          </div>
        )}


        {/* ═══ STEP 2: Gap Analysis ═══ */}
        {step === 2 && (
          <div className="border-t border-rule pt-s-3">
            <h2 className="text-lg font-semibold mb-2">2. Gap Analysis</h2>

            {gapLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent animate-spin" />
                <p className="text-ink-50 mt-3 text-sm">Analyzing gaps between your experience and this job...</p>
              </div>
            ) : gapResult ? (
              <div className="space-y-4">
                {/* Coverage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-72">Coverage: <strong>{gapResult.matched.length}</strong> of <strong>{gapResult.jdKeywordsFound}</strong> required skills</span>
                  <span className={`text-xl font-bold ${gapResult.coverage >= 70 ? "text-ink-72" : gapResult.coverage >= 40 ? "text-yellow-600" : "text-ink-72"}`}>
                    {gapResult.coverage}%
                  </span>
                </div>
                <div className="w-full bg-rule h-[2px]">
                  <div className="h-[2px] bg-ink"
                    style={{ width: `${gapResult.coverage}%` }} />
                </div>

                {/* Matched */}
                {gapResult.matched.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-ink-72 mb-2">You have ({gapResult.matched.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {gapResult.matched.map((m) => (
                        <span key={m.keyword} className="px-2 py-0.5 font-mono text-meta text-ink-50 text-xs">{m.keyword}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps */}
                {gapResult.gaps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-ink-72 mb-2">Gaps ({gapResult.gaps.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {gapResult.gaps.map((g) => (
                        <span key={g} className="px-2 py-0.5 text-ink text-xs">{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {gapResult.gaps.length > 0 ? (
                    <button onClick={() => setStep(3)}
                      className="px-5 py-2 border-[1.5px] border-live text-live bg-transparent text-sm font-medium cursor-pointer">
                      Next: Address Gaps &rarr;
                    </button>
                  ) : (
                    <button onClick={handleBuildResume}
                      className="px-5 py-2 border-[1.5px] border-live text-live bg-transparent text-sm font-medium cursor-pointer">
                      Skip to Build Resume &rarr;
                    </button>
                  )}
                  <button onClick={handleBuildResume}
                    className="px-4 py-2 text-ink-72 text-sm cursor-pointer">
                    Skip gaps, build anyway
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}


        {/* ═══ STEP 3: Fill Gaps ═══ */}
        {step === 3 && (
          <div className="border-t border-rule pt-s-3">
            <h2 className="text-lg font-semibold mb-2">3. Address Gaps</h2>
            <p className="text-sm text-ink-50 mb-4">
              For each gap, either add it to your experience (&quot;I have this&quot;) or mark it as a real gap.
            </p>

            <div className="space-y-3">
              {gapItems.map((gap) => (
                <div key={gap.keyword} className={`p-3 border ${
                  gap.status === "filled" ? "border-rule" :
                  gap.status === "real-gap" ? "border-rule opacity-60" :
                  "border-rule"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{gap.keyword}</span>
                    {gap.status === "gap" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenFillForm(gap.keyword)}
                          className="px-3 py-1 font-mono text-meta text-ink-50 rounded text-xs font-medium cursor-pointer">
                          I have this
                        </button>
                        <button onClick={() => handleMarkRealGap(gap.keyword)}
                          className="px-3 py-1 border border-ink text-ink bg-transparent rounded text-xs font-medium cursor-pointer">
                          Real gap
                        </button>
                      </div>
                    )}
                    {gap.status === "filled" && <span className="text-xs text-ink-72 font-medium">Added to experience</span>}
                    {gap.status === "real-gap" && <span className="text-xs text-ink-35 font-medium">Acknowledged gap</span>}
                  </div>

                  {/* Fill form */}
                  {fillFormOpen === gap.keyword && (
                    <div className="mt-3 p-3 bg-paper space-y-2">
                      <textarea rows={2} value={fillHighlightText}
                        onChange={(e) => setFillHighlightText(e.target.value)}
                        placeholder="Describe how you demonstrate this skill..."
                        className="w-full px-3 py-2 border border-rule text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink" />
                      <div>
                        <p className="text-xs text-ink-50 mb-1">Add to role(s):</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {experienceRoles.map((role) => (
                            <label key={role.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={fillSelectedRoles.includes(role.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setFillSelectedRoles([...fillSelectedRoles, role.id]);
                                  else setFillSelectedRoles(fillSelectedRoles.filter((id) => id !== role.id));
                                }} className="h-3 w-3 text-ink-72 rounded border-rule" />
                              <span className="text-ink-72">{role.title} at {role.company}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveFillGap}
                          disabled={!fillHighlightText.trim() || fillSelectedRoles.length === 0}
                          className="px-3 py-1 border-[1.5px] border-live text-live text-xs cursor-pointer disabled:opacity-50">
                          Save
                        </button>
                        <button onClick={() => setFillFormOpen(null)}
                          className="px-3 py-1 text-ink-72 text-xs cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button onClick={handleBuildResume}
                className="px-5 py-2 border-[1.5px] border-live text-live bg-transparent text-sm font-medium cursor-pointer">
                Next: Build Resume &rarr;
              </button>
            </div>
          </div>
        )}


        {/* ═══ STEP 4: Build Resume ═══ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="border-t border-rule pt-s-3">
              <h2 className="text-lg font-semibold mb-2">4. Build Your Resume</h2>
              <p className="text-sm text-ink-50 mb-4">
                Select, edit, or improve highlights for each role. Click &quot;Improve&quot; for GPT-4o suggestions.
              </p>
            </div>

            {buildLoading ? (
              <div className="border-t border-rule pt-s-3 text-center">
                <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent animate-spin" />
                <p className="text-ink-50 mt-3 text-sm">GPT-4o is selecting the best highlights for this job...</p>
              </div>
            ) : (
              roleBuild.map((role, roleIdx) => (
                <div key={role.id} className="border-t border-rule pt-s-3">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{role.title}</h3>
                      <p className="text-xs text-ink-50">{role.company} &middot; {formatDate(role.startDate)} &ndash; {role.isCurrent ? "Present" : formatDate(role.endDate)}</p>
                    </div>
                    <span className="text-xs text-ink-35">{role.recommendedHighlights.filter((h) => h.selected).length} selected</span>
                  </div>

                  <div className="space-y-2">
                    {role.recommendedHighlights.map((h, hIdx) => (
                      <div key={hIdx} className={`p-2.5 border ${h.selected ? "border-rule" : "bg-paper border-rule opacity-50"}`}>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" checked={h.selected} onChange={() => handleToggleHighlight(roleIdx, hIdx)}
                            className="mt-1 h-4 w-4 text-ink underline rounded border-rule shrink-0 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <input type="text" value={h.edited || h.text}
                              onChange={(e) => handleEditHighlight(roleIdx, hIdx, e.target.value)}
                              className="w-full text-sm text-ink bg-transparent border-0 p-0 focus:outline-none focus:ring-0" />
                            {h.reason && <p className="text-[10px] text-ink-35 mt-0.5">{h.reason}</p>}
                          </div>
                          <button onClick={() => handleImprove(roleIdx, hIdx)}
                            disabled={improvingIdx?.role === roleIdx && improvingIdx?.highlight === hIdx}
                            className="px-2 py-1 text-[10px] font-medium text-ink underline  rounded cursor-pointer disabled:opacity-50 shrink-0">
                            {improvingIdx?.role === roleIdx && improvingIdx?.highlight === hIdx ? "..." : "Improve"}
                          </button>
                        </div>

                        {/* Improved version */}
                        {h.showImproved && h.improved && (
                          <div className="mt-2 ml-6 p-2  rounded border">
                            <p className="text-sm text-ink">{h.improved}</p>
                            <p className="text-[10px] text-ink-50 mt-1">{h.improvementExplanation}</p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleAcceptImproved(roleIdx, hIdx)}
                                className="px-2 py-0.5 border-[1.5px] border-live text-live bg-transparent rounded text-[10px] cursor-pointer">Accept</button>
                              <button onClick={() => handleKeepOriginal(roleIdx, hIdx)}
                                className="px-2 py-0.5 border border-ink text-ink text-[10px] cursor-pointer">Keep Original</button>
                              <button onClick={() => handleKeepBoth(roleIdx, hIdx)}
                                className="px-2 py-0.5 font-mono text-meta text-ink-50 rounded text-[10px] cursor-pointer">Keep Both</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add highlight */}
                  <div className="mt-2">
                    <AddHighlightInline onAdd={(text) => handleAddHighlight(roleIdx, text)} />
                  </div>
                </div>
              ))
            )}

            {/* Generate button */}
            {!buildLoading && roleBuild.length > 0 && (
              <div className="border-t border-rule pt-s-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ink-72 font-medium">
                      {roleBuild.reduce((sum, r) => sum + r.recommendedHighlights.filter((h) => h.selected).length, 0)} highlights selected across {roleBuild.filter((r) => r.recommendedHighlights.some((h) => h.selected)).length} roles
                    </p>
                    <p className="text-xs text-ink-35 mt-0.5">Ready to generate your tailored resume draft</p>
                  </div>
                  <button
                    onClick={handleGenerateDraft}
                    disabled={isGeneratingDraft || roleBuild.every((r) => !r.recommendedHighlights.some((h) => h.selected))}
                    className="px-6 py-2.5 border-[1.5px] border-live text-live bg-transparent text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingDraft ? "Generating..." : "Generate Draft Resume"}
                  </button>
                </div>
              </div>
            )}

            {/* Generated draft */}
            {draftResume && (
              <div className="border-t border-rule overflow-hidden">
                <div className="bg-paper border-b border-rule px-6 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-ink">Resume Draft</h3>
                  <div className="flex gap-3">
                    <button onClick={() => { navigator.clipboard.writeText(draftResume); }}
                      className="text-xs text-ink underline font-medium cursor-pointer">
                      Copy to clipboard
                    </button>
                    <button onClick={handleGenerateCover} disabled={isGeneratingCover}
                      className="px-3 py-1 border-[1.5px] border-live text-live bg-transparent rounded text-xs font-medium cursor-pointer disabled:opacity-50">
                      {isGeneratingCover ? "Generating..." : "Next: Cover Letter \u2192"}
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 whitespace-pre-wrap text-sm text-ink font-mono leading-relaxed max-h-[600px] overflow-y-auto">
                  {draftResume}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 5: Cover Letter ═══ */}
        {step === 5 && (
          <div className="border-t border-rule overflow-hidden">
            <div className="bg-paper border-b border-rule px-6 py-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-ink">5. Cover Letter Draft</h3>
              <div className="flex gap-3">
                <button onClick={() => { if (coverLetter) navigator.clipboard.writeText(coverLetter); }}
                  className="text-xs text-ink underline font-medium cursor-pointer">
                  Copy
                </button>
                <button onClick={() => setStep(6)}
                  className="px-3 py-1 border-[1.5px] border-live text-live bg-transparent rounded text-xs font-medium cursor-pointer">
                  Next: Export &rarr;
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <textarea
                rows={15}
                value={coverLetter || ""}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full px-3 py-2 border border-rule text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink leading-relaxed"
              />
              <div className="flex gap-3 mt-3">
                <button onClick={handleGenerateCover} disabled={isGeneratingCover}
                  className="px-4 py-2 border border-ink text-ink bg-transparent text-sm cursor-pointer disabled:opacity-50">
                  {isGeneratingCover ? "Regenerating..." : "Regenerate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 6: Export ═══ */}
        {step === 6 && (
          <div className="border-t border-rule pt-s-3">
            <h2 className="text-lg font-semibold mb-2">6. Export</h2>
            <p className="text-sm text-ink-50 mb-4">Download your resume and cover letter as PDF files.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resume */}
              <div className="border border-rule p-4">
                <h3 className="text-sm font-medium text-ink mb-2">Resume</h3>
                <p className="text-xs text-ink-35 mb-3">Your tailored resume draft</p>
                <div className="flex gap-2">
                  <button onClick={() => handleExportPDF("resume")} disabled={!draftResume || isExporting}
                    className="px-4 py-2 border-[1.5px] border-live text-live bg-transparent text-sm cursor-pointer disabled:opacity-50">
                    {isExporting ? "Exporting..." : "Download PDF"}
                  </button>
                  <button onClick={() => { if (draftResume) navigator.clipboard.writeText(draftResume); }}
                    className="px-4 py-2 border border-ink text-ink bg-transparent text-sm cursor-pointer">
                    Copy Text
                  </button>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="border border-rule p-4">
                <h3 className="text-sm font-medium text-ink mb-2">Cover Letter</h3>
                <p className="text-xs text-ink-35 mb-3">Your tailored half-page cover letter</p>
                <div className="flex gap-2">
                  <button onClick={() => handleExportPDF("cover-letter")} disabled={!coverLetter || isExporting}
                    className="px-4 py-2 border-[1.5px] border-live text-live bg-transparent text-sm cursor-pointer disabled:opacity-50">
                    {isExporting ? "Exporting..." : "Download PDF"}
                  </button>
                  <button onClick={() => { if (coverLetter) navigator.clipboard.writeText(coverLetter); }}
                    className="px-4 py-2 border border-ink text-ink bg-transparent text-sm cursor-pointer">
                    Copy Text
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-35 mt-4">
              Drafts are autosaved. You can come back to this project later from the Resume Tools page.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}


// ─── Mini component for adding a highlight inline ────────────────────────────

function AddHighlightInline({ onAdd }: { onAdd: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-ink-50-50 cursor-pointer mt-1">
        + Add highlight
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-1">
      <input type="text" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Add a highlight..."
        className="flex-1 px-2 py-1 border border-rule rounded text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
        onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onAdd(text); setText(""); setOpen(false); } }} />
      <button onClick={() => { if (text.trim()) { onAdd(text); setText(""); setOpen(false); } }}
        className="px-2 py-1 font-mono text-meta text-ink-50 rounded text-xs cursor-pointer">Add</button>
      <button onClick={() => { setText(""); setOpen(false); }}
        className="px-2 py-1 text-ink-50 text-xs cursor-pointer">Cancel</button>
    </div>
  );
}
