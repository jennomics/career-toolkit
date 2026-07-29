"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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

type WizardStep = 1 | 2 | 3 | 4;

// ─── Component ──────────────────────────────────────────────────────────────

export default function ResumeBuildPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Step 1: Job selection
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobsLoading, setJobsLoading] = useState(true);


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
        setError(data.error || "Gap analysis failed");
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
        setError(data.error || "Build failed");
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Build Resume</h1>
            <p className="text-sm text-gray-500 mt-1">Guided workflow: Job → Gap Analysis → Fill Gaps → Build</p>
          </div>
          <div className="flex gap-4">
            <Link href="/resume" className="text-sm text-blue-600 hover:text-blue-800 font-medium">&larr; Resume Tools</Link>
            <Link href="/experience" className="text-sm text-blue-600 hover:text-blue-800 font-medium">My Experience</Link>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 text-xs font-medium">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`flex items-center gap-1 ${step >= s ? "text-purple-700" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step > s ? "bg-purple-600 text-white" : step === s ? "bg-purple-100 text-purple-700 ring-2 ring-purple-300" : "bg-gray-200"
              }`}>{step > s ? "\u2713" : s}</span>
              <span className="hidden sm:inline">{["Select Job", "Gap Analysis", "Fill Gaps", "Build Resume"][s - 1]}</span>
              {s < 4 && <span className="mx-1 text-gray-300">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}


        {/* ═══ STEP 1: Select Job ═══ */}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">1. Select a Job to Target</h2>
            <p className="text-sm text-gray-500 mb-4">Choose a job from your library. The resume will be tailored to this specific role.</p>

            {jobsLoading ? (
              <p className="text-sm text-gray-400 py-4">Loading jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-500">No jobs saved. <Link href="/" className="text-blue-600">Add some first</Link>.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {jobs.map((job) => (
                  <label key={job.id} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                    selectedJobId === job.id ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50 border border-transparent"
                  }`}>
                    <input type="radio" name="target-job" value={job.id} checked={selectedJobId === job.id}
                      onChange={() => setSelectedJobId(job.id)} className="h-4 w-4 text-purple-600 border-gray-300" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-500">{job.company} &middot; {job.skills.length} skills &middot; {new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-4">
              <button onClick={handleSelectJob} disabled={!selectedJobId}
                className="px-5 py-2 bg-purple-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Next: Run Gap Analysis &rarr;
              </button>
            </div>
          </div>
        )}


        {/* ═══ STEP 2: Gap Analysis ═══ */}
        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">2. Gap Analysis</h2>

            {gapLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 mt-3 text-sm">Analyzing gaps between your experience and this job...</p>
              </div>
            ) : gapResult ? (
              <div className="space-y-4">
                {/* Coverage */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Coverage: <strong>{gapResult.matched.length}</strong> of <strong>{gapResult.jdKeywordsFound}</strong> required skills</span>
                  <span className={`text-xl font-bold ${gapResult.coverage >= 70 ? "text-green-600" : gapResult.coverage >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                    {gapResult.coverage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${gapResult.coverage >= 70 ? "bg-green-500" : gapResult.coverage >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${gapResult.coverage}%` }} />
                </div>

                {/* Matched */}
                {gapResult.matched.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-green-700 mb-2">You have ({gapResult.matched.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {gapResult.matched.map((m) => (
                        <span key={m.keyword} className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">{m.keyword}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps */}
                {gapResult.gaps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-700 mb-2">Gaps ({gapResult.gaps.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {gapResult.gaps.map((g) => (
                        <span key={g} className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs">{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {gapResult.gaps.length > 0 ? (
                    <button onClick={() => setStep(3)}
                      className="px-5 py-2 bg-purple-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-purple-700">
                      Next: Address Gaps &rarr;
                    </button>
                  ) : (
                    <button onClick={handleBuildResume}
                      className="px-5 py-2 bg-purple-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-purple-700">
                      Skip to Build Resume &rarr;
                    </button>
                  )}
                  <button onClick={handleBuildResume}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm cursor-pointer">
                    Skip gaps, build anyway
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}


        {/* ═══ STEP 3: Fill Gaps ═══ */}
        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">3. Address Gaps</h2>
            <p className="text-sm text-gray-500 mb-4">
              For each gap, either add it to your experience (&quot;I have this&quot;) or mark it as a real gap.
            </p>

            <div className="space-y-3">
              {gapItems.map((gap) => (
                <div key={gap.keyword} className={`p-3 rounded-lg border ${
                  gap.status === "filled" ? "bg-green-50 border-green-200" :
                  gap.status === "real-gap" ? "bg-gray-50 border-gray-200 opacity-60" :
                  "bg-white border-gray-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{gap.keyword}</span>
                    {gap.status === "gap" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenFillForm(gap.keyword)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium cursor-pointer hover:bg-green-200">
                          I have this
                        </button>
                        <button onClick={() => handleMarkRealGap(gap.keyword)}
                          className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium cursor-pointer hover:bg-gray-200">
                          Real gap
                        </button>
                      </div>
                    )}
                    {gap.status === "filled" && <span className="text-xs text-green-600 font-medium">Added to experience</span>}
                    {gap.status === "real-gap" && <span className="text-xs text-gray-400 font-medium">Acknowledged gap</span>}
                  </div>

                  {/* Fill form */}
                  {fillFormOpen === gap.keyword && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                      <textarea rows={2} value={fillHighlightText}
                        onChange={(e) => setFillHighlightText(e.target.value)}
                        placeholder="Describe how you demonstrate this skill..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Add to role(s):</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {experienceRoles.map((role) => (
                            <label key={role.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={fillSelectedRoles.includes(role.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setFillSelectedRoles([...fillSelectedRoles, role.id]);
                                  else setFillSelectedRoles(fillSelectedRoles.filter((id) => id !== role.id));
                                }} className="h-3 w-3 text-green-600 rounded border-gray-300" />
                              <span className="text-gray-700">{role.title} at {role.company}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveFillGap}
                          disabled={!fillHighlightText.trim() || fillSelectedRoles.length === 0}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs cursor-pointer hover:bg-green-700 disabled:opacity-50">
                          Save
                        </button>
                        <button onClick={() => setFillFormOpen(null)}
                          className="px-3 py-1 text-gray-600 text-xs cursor-pointer hover:text-gray-800">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button onClick={handleBuildResume}
                className="px-5 py-2 bg-purple-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-purple-700">
                Next: Build Resume &rarr;
              </button>
            </div>
          </div>
        )}


        {/* ═══ STEP 4: Build Resume ═══ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-2">4. Build Your Resume</h2>
              <p className="text-sm text-gray-500 mb-4">
                Select, edit, or improve highlights for each role. Click &quot;Improve&quot; for GPT-4o suggestions.
              </p>
            </div>

            {buildLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
                <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 mt-3 text-sm">GPT-4o is selecting the best highlights for this job...</p>
              </div>
            ) : (
              roleBuild.map((role, roleIdx) => (
                <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{role.title}</h3>
                      <p className="text-xs text-gray-500">{role.company} &middot; {formatDate(role.startDate)} &ndash; {role.isCurrent ? "Present" : formatDate(role.endDate)}</p>
                    </div>
                    <span className="text-xs text-gray-400">{role.recommendedHighlights.filter((h) => h.selected).length} selected</span>
                  </div>

                  <div className="space-y-2">
                    {role.recommendedHighlights.map((h, hIdx) => (
                      <div key={hIdx} className={`p-2.5 rounded-md border ${h.selected ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100 opacity-50"}`}>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" checked={h.selected} onChange={() => handleToggleHighlight(roleIdx, hIdx)}
                            className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-300 shrink-0 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <input type="text" value={h.edited || h.text}
                              onChange={(e) => handleEditHighlight(roleIdx, hIdx, e.target.value)}
                              className="w-full text-sm text-gray-800 bg-transparent border-0 p-0 focus:outline-none focus:ring-0" />
                            {h.reason && <p className="text-[10px] text-gray-400 mt-0.5">{h.reason}</p>}
                          </div>
                          <button onClick={() => handleImprove(roleIdx, hIdx)}
                            disabled={improvingIdx?.role === roleIdx && improvingIdx?.highlight === hIdx}
                            className="px-2 py-1 text-[10px] font-medium text-purple-600 bg-purple-50 rounded cursor-pointer hover:bg-purple-100 disabled:opacity-50 shrink-0">
                            {improvingIdx?.role === roleIdx && improvingIdx?.highlight === hIdx ? "..." : "Improve"}
                          </button>
                        </div>

                        {/* Improved version */}
                        {h.showImproved && h.improved && (
                          <div className="mt-2 ml-6 p-2 bg-purple-50 rounded border border-purple-100">
                            <p className="text-sm text-purple-900">{h.improved}</p>
                            <p className="text-[10px] text-purple-500 mt-1">{h.improvementExplanation}</p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleAcceptImproved(roleIdx, hIdx)}
                                className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] cursor-pointer hover:bg-purple-700">Accept</button>
                              <button onClick={() => handleKeepOriginal(roleIdx, hIdx)}
                                className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] cursor-pointer hover:bg-gray-300">Keep Original</button>
                              <button onClick={() => handleKeepBoth(roleIdx, hIdx)}
                                className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] cursor-pointer hover:bg-green-200">Keep Both</button>
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
        className="text-xs text-purple-500 hover:text-purple-700 cursor-pointer mt-1">
        + Add highlight
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-1">
      <input type="text" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Add a highlight..."
        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-400"
        onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onAdd(text); setText(""); setOpen(false); } }} />
      <button onClick={() => { if (text.trim()) { onAdd(text); setText(""); setOpen(false); } }}
        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs cursor-pointer">Add</button>
      <button onClick={() => { setText(""); setOpen(false); }}
        className="px-2 py-1 text-gray-500 text-xs cursor-pointer">Cancel</button>
    </div>
  );
}
