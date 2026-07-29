"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface ResumeData {
  targetRole: string;
  summary: string;
  workExperience?: {
    title: string;
    company: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    bullets: string[];
  }[];
  experienceHighlights?: string[];
  keySkills: string[];
  additionalQualifications: string[];
  generatedAt: string;
  source: string;
  mode?: string;
  coverageScore?: number | null;
  stats?: {
    jobsAnalyzed: number;
    experienceRoles?: number;
    phrasesConsidered: number;
    keywordsAvailable: number;
  };
}

interface CoverageData {
  overallScore: number;
  jobScores: {
    jobId: string;
    jobTitle: string;
    company: string;
    score: number;
    matchedSkills: string[];
    missedSkills: string[];
  }[];
  topGaps: string[];
}

interface GapData {
  jdKeywordsFound: number;
  coverage: number;
  matched: { keyword: string; strength: string; jobCount: number }[];
  gaps: string[];
  relevantPhrases: { id: string; text: string; category: string; jobTitle: string; company: string }[];
}

interface SavedJob {
  id: string;
  title: string;
  company: string;
  description: string;
  status: string;
  createdAt: string;
}

type Tab = "generate" | "gap";
type GapSource = "saved" | "paste";

function formatResumeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ResumePage() {
  const [tab, setTab] = useState<Tab>("generate");
  const [targetRole, setTargetRole] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genericMode, setGenericMode] = useState(false);
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [isScoringCoverage, setIsScoringCoverage] = useState(false);

  // Gap analysis state
  const [gapSource, setGapSource] = useState<GapSource>("saved");
  const [gapDescription, setGapDescription] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gapResult, setGapResult] = useState<GapData | null>(null);
  const [gapError, setGapError] = useState<string | null>(null);

  // Fetch saved jobs when gap tab is selected
  const hasFetchedJobs = useRef(false);

  useEffect(() => {
    if (tab !== "gap") return;
    if (hasFetchedJobs.current) return;
    hasFetchedJobs.current = true;

    let cancelled = false;
    setJobsLoading(true);

    fetch("/api/jobs")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setSavedJobs(data);
      })
      .catch(() => {
        // Non-critical — user can still paste
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

    return () => { cancelled = true; };
  }, [tab]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genericMode && !targetRole.trim()) return;

    setIsGenerating(true);
    setError(null);
    setResume(null);
    setCoverageData(null);

    try {
      const payload: Record<string, unknown> = genericMode
        ? { mode: "generic" }
        : { targetRole: targetRole.trim() };

      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Generation failed (${res.status})`);
        return;
      }

      setResume(data);

      // If generic mode, fetch coverage score
      if (genericMode) {
        fetchCoverageScore(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function fetchCoverageScore(resumeData: ResumeData) {
    setIsScoringCoverage(true);
    try {
      // Build a text representation of the resume for coverage scoring
      const sections: string[] = [resumeData.summary];
      if (resumeData.workExperience) {
        for (const role of resumeData.workExperience) {
          sections.push(role.title, role.company);
          sections.push(...role.bullets);
        }
      }
      if (resumeData.keySkills) {
        sections.push(...resumeData.keySkills);
      }
      if (resumeData.additionalQualifications) {
        sections.push(...resumeData.additionalQualifications);
      }
      const resumeContent = sections.join("\n");

      const res = await fetch("/api/resume/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeContent }),
      });

      const data = await res.json();
      if (res.ok) {
        setCoverageData(data);
      }
    } catch {
      // Coverage scoring is non-critical, don't show error
    } finally {
      setIsScoringCoverage(false);
    }
  }

  function copyToClipboard() {
    if (!resume) return;
    const sections: string[] = [
      `# ${resume.targetRole}`,
      "",
      "## Summary",
      resume.summary,
    ];

    if (resume.workExperience && resume.workExperience.length > 0) {
      sections.push("", "## Work Experience");
      for (const role of resume.workExperience) {
        const dateRange = role.isCurrent
          ? `${formatResumeDate(role.startDate)} – Present`
          : `${formatResumeDate(role.startDate)} – ${role.endDate ? formatResumeDate(role.endDate) : "Present"}`;
        sections.push(`\n### ${role.title} | ${role.company}${role.location ? ` | ${role.location}` : ""}`);
        sections.push(dateRange);
        for (const bullet of role.bullets) {
          sections.push(`- ${bullet}`);
        }
      }
    } else if (resume.experienceHighlights && resume.experienceHighlights.length > 0) {
      sections.push("", "## Experience Highlights");
      for (const h of resume.experienceHighlights) {
        sections.push(`- ${h}`);
      }
    }

    sections.push("", "## Key Skills", resume.keySkills.join(" | "));

    if (resume.additionalQualifications.length > 0) {
      sections.push("", "## Additional Qualifications");
      for (const q of resume.additionalQualifications) {
        sections.push(`- ${q}`);
      }
    }

    navigator.clipboard.writeText(sections.join("\n")).catch(() => {});
  }

  async function handleGapAnalysis(e: React.FormEvent) {
    e.preventDefault();

    // Determine which description to use
    let description: string;
    if (gapSource === "saved") {
      const job = savedJobs.find((j) => j.id === selectedJobId);
      if (!job) return;
      description = job.description;
    } else {
      if (!gapDescription.trim() || gapDescription.length < 20) return;
      description = gapDescription.trim();
    }

    setIsAnalyzing(true);
    setGapError(null);
    setGapResult(null);

    try {
      const res = await fetch("/api/resume/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGapError(data.error || `Analysis failed (${res.status})`);
        return;
      }

      setGapResult(data);
    } catch (err) {
      setGapError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate a tailored resume from your experience and saved job data
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Home
            </Link>
            <Link href="/experience" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              My Experience
            </Link>
            <Link href="/phrases" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Phrases
            </Link>
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              &larr; Jobs
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit" role="tablist" aria-label="Resume tools">
          <button
            role="tab"
            aria-selected={tab === "generate"}
            onClick={() => setTab("generate")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === "generate" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Generate Resume
          </button>
          <button
            role="tab"
            aria-selected={tab === "gap"}
            onClick={() => setTab("gap")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === "gap" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Gap Analysis
          </button>
        </div>

        {/* === GENERATE TAB === */}
        {tab === "generate" && (
          <>
            {/* Target role form */}
            <form onSubmit={handleGenerate} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Mode toggle */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setGenericMode(false)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    !genericMode ? "bg-blue-100 text-blue-800 border border-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Targeted Resume
                </button>
                <button
                  type="button"
                  onClick={() => setGenericMode(true)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    genericMode ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Generic Resume (optimize for all jobs)
                </button>
              </div>

              {!genericMode ? (
                <>
                  <label htmlFor="target-role" className="block text-sm font-medium text-gray-700 mb-2">
                    What role are you targeting?
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Enter a role title (e.g., &quot;VP of Data Science&quot;, &quot;Senior Product Manager&quot;).
                    The AI will use your work experience and tracked keywords to build a tailored resume.
                  </p>
                  <div className="flex gap-3">
                    <input
                      id="target-role"
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g., VP of Data and AI"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!targetRole.trim() || isGenerating}
                      className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isGenerating ? "Generating..." : "Generate Resume"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-medium text-purple-900 mb-1">Generic Resume Mode</h3>
                    <p className="text-xs text-purple-700">
                      Analyzes ALL your saved job descriptions to identify the most commonly demanded skills,
                      then generates a resume that maximizes coverage across all positions. Ideal when you want
                      one resume that works for the broadest range of opportunities in your job library.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-6 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isGenerating ? "Generating..." : "Generate Generic Resume"}
                  </button>
                </>
              )}
            </form>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Loading */}
            {isGenerating && (
              <div className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Generating resume" />
                <p className="text-gray-500 mt-3 text-sm">Analyzing your experience, keywords, and phrases...</p>
              </div>
            )}

            {/* Generated resume */}
            {resume && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {/* Header bar */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-medium text-gray-700">
                      Resume for: <span className="text-gray-900">{resume.targetRole}</span>
                    </h2>
                    {resume.stats && (
                      <span className="text-xs text-gray-400">
                        ({resume.stats.experienceRoles ? `${resume.stats.experienceRoles} roles, ` : ""}{resume.stats.jobsAnalyzed} jobs, {resume.stats.phrasesConsidered} phrases analyzed)
                      </span>
                    )}
                    {resume.mode === "generic" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                        Generic
                      </span>
                    )}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    aria-label="Copy resume to clipboard"
                  >
                    Copy to clipboard
                  </button>
                </div>

                <div className="px-6 py-6 space-y-6">
                  {/* Summary */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                      Professional Summary
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
                  </section>

                  {/* Work Experience (structured roles) */}
                  {resume.workExperience && resume.workExperience.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                        Work Experience
                      </h3>
                      <div className="space-y-5">
                        {resume.workExperience.map((role, i) => (
                          <div key={i} className="border-l-2 border-blue-200 pl-4">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="text-sm font-semibold text-gray-900">{role.title}</h4>
                              <span className="text-xs text-gray-400 shrink-0">
                                {formatResumeDate(role.startDate)} &ndash; {role.isCurrent ? "Present" : role.endDate ? formatResumeDate(role.endDate) : "Present"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1.5">
                              {role.company}{role.location && ` \u2022 ${role.location}`}
                            </p>
                            {role.bullets.length > 0 && (
                              <ul className="space-y-1">
                                {role.bullets.map((bullet, j) => (
                                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                    <span className="text-blue-500 mt-1 shrink-0">&#x2022;</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Legacy: Experience Highlights (flat list, for resumes generated before work experience integration) */}
                  {(!resume.workExperience || resume.workExperience.length === 0) && resume.experienceHighlights && resume.experienceHighlights.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        Experience Highlights
                      </h3>
                      <ul className="space-y-1.5">
                        {resume.experienceHighlights.map((highlight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-blue-500 mt-1 shrink-0">&#x2022;</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Key Skills */}
                  {resume.keySkills.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        Key Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {resume.keySkills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Additional Qualifications */}
                  {resume.additionalQualifications.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
                        Additional Qualifications
                      </h3>
                      <ul className="space-y-1.5">
                        {resume.additionalQualifications.map((qual, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-500 mt-1 shrink-0">&#x2022;</span>
                            <span>{qual}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
                  <p className="text-xs text-gray-400">
                    Generated {new Date(resume.generatedAt).toLocaleString()} via {resume.source}
                    {resume.mode === "generic" ? " (generic mode)" : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Coverage Score (shown for generic mode) */}
            {isScoringCoverage && (
              <div className="text-center py-6">
                <div className="inline-block w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Calculating coverage" />
                <p className="text-gray-500 mt-2 text-sm">Calculating coverage score across all saved jobs...</p>
              </div>
            )}

            {coverageData && (
              <div className="space-y-4">
                {/* Overall coverage score */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Coverage Score</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        How well this resume covers requirements across all {coverageData.jobScores.length} saved jobs
                      </p>
                    </div>
                    <span className={`text-3xl font-bold ${
                      coverageData.overallScore >= 70 ? "text-green-600" :
                      coverageData.overallScore >= 40 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {coverageData.overallScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        coverageData.overallScore >= 70 ? "bg-green-500" :
                        coverageData.overallScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${coverageData.overallScore}%` }}
                    />
                  </div>
                </div>

                {/* Top gaps */}
                {coverageData.topGaps.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-red-700 mb-3">
                      Top Gaps ({coverageData.topGaps.length} most-missed skills)
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Skills frequently required across saved jobs but not represented in this resume
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {coverageData.topGaps.map((gap) => (
                        <span
                          key={gap}
                          className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium"
                        >
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-job breakdown */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Per-Job Coverage Breakdown</h3>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {coverageData.jobScores
                      .sort((a, b) => b.score - a.score)
                      .map((job) => (
                        <div key={job.jobId} className="px-6 py-3 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{job.jobTitle}</p>
                            <p className="text-xs text-gray-500">{job.company}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  job.score >= 70 ? "bg-green-500" :
                                  job.score >= 40 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${job.score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium w-10 text-right ${
                              job.score >= 70 ? "text-green-600" :
                              job.score >= 40 ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {job.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* === GAP ANALYSIS TAB === */}
        {tab === "gap" && (
          <>
            <form onSubmit={handleGapAnalysis} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose a job description to analyze
              </label>
              <p className="text-xs text-gray-400 mb-4">
                Select a saved job from your library, or paste a new one. I&apos;ll compare its requirements against your saved skills and phrases.
              </p>

              {/* Source toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4" role="radiogroup" aria-label="Job description source">
                <button
                  type="button"
                  role="radio"
                  aria-checked={gapSource === "saved"}
                  onClick={() => setGapSource("saved")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    gapSource === "saved" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  From Job Library
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={gapSource === "paste"}
                  onClick={() => setGapSource("paste")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    gapSource === "paste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Paste New
                </button>
              </div>

              {/* Saved job selector */}
              {gapSource === "saved" && (
                <div>
                  {jobsLoading ? (
                    <p className="text-sm text-gray-400 py-4">Loading saved jobs...</p>
                  ) : savedJobs.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-500">No saved jobs yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Add jobs from the <Link href="/jobs" className="text-blue-600 hover:text-blue-800">Job Library</Link> first, or paste a description below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {savedJobs.map((job) => (
                        <label
                          key={job.id}
                          className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                            selectedJobId === job.id
                              ? "bg-blue-50 border border-blue-200"
                              : "hover:bg-gray-50 border border-transparent"
                          }`}
                        >
                          <input
                            type="radio"
                            name="gap-job"
                            value={job.id}
                            checked={selectedJobId === job.id}
                            onChange={() => setSelectedJobId(job.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                            <p className="text-xs text-gray-500">{job.company} &middot; {new Date(job.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            job.status === "applied" ? "bg-blue-100 text-blue-700" :
                            job.status === "interviewing" ? "bg-yellow-100 text-yellow-700" :
                            job.status === "offer" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {job.status}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Paste textarea (alternative) */}
              {gapSource === "paste" && (
                <textarea
                  id="gap-jd"
                  rows={8}
                  value={gapDescription}
                  onChange={(e) => setGapDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  disabled={
                    isAnalyzing ||
                    (gapSource === "saved" && !selectedJobId) ||
                    (gapSource === "paste" && gapDescription.length < 20)
                  }
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Gaps"}
                </button>
              </div>
            </form>

            {/* Gap error */}
            {gapError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
                <strong>Error:</strong> {gapError}
              </div>
            )}

            {/* Gap loading */}
            {isAnalyzing && (
              <div className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Analyzing gaps" />
                <p className="text-gray-500 mt-3 text-sm">Extracting keywords and comparing against your profile...</p>
              </div>
            )}

            {/* Gap results */}
            {gapResult && (
              <div className="space-y-4">
                {/* Coverage score */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Coverage Score</h3>
                    <span className={`text-2xl font-bold ${
                      gapResult.coverage >= 70 ? "text-green-600" :
                      gapResult.coverage >= 40 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {gapResult.coverage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        gapResult.coverage >= 70 ? "bg-green-500" :
                        gapResult.coverage >= 40 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${gapResult.coverage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    You have {gapResult.matched.length} of {gapResult.jdKeywordsFound} required skills in your profile
                  </p>
                </div>

                {/* What you have */}
                {gapResult.matched.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-green-700 mb-3">
                      What You Have ({gapResult.matched.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {gapResult.matched.map((m) => (
                        <span
                          key={m.keyword}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            m.strength === "strong"
                              ? "bg-green-100 text-green-800"
                              : m.strength === "moderate"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                          title={`Appears in ${m.jobCount} of your saved jobs`}
                        >
                          {m.keyword}
                          {m.strength === "strong" && " \u2713\u2713"}
                          {m.strength === "moderate" && " \u2713"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps */}
                {gapResult.gaps.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-red-700 mb-3">
                      Gaps to Address ({gapResult.gaps.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {gapResult.gaps.map((gap) => (
                        <span
                          key={gap}
                          className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium"
                        >
                          {gap}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      These skills appear in the JD but aren&apos;t in your saved job descriptions yet.
                      Consider adding jobs that highlight these skills.
                    </p>
                  </div>
                )}

                {/* Relevant phrases you already have */}
                {gapResult.relevantPhrases.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Relevant Phrases You Can Use ({gapResult.relevantPhrases.length})
                    </h3>
                    <ul className="space-y-2">
                      {gapResult.relevantPhrases.map((phrase) => (
                        <li key={phrase.id} className="flex items-start gap-2 text-sm">
                          <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                            phrase.category === "responsibility"
                              ? "bg-green-100 text-green-700"
                              : phrase.category === "requirement"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {phrase.category === "responsibility" ? "DO" : phrase.category === "requirement" ? "NEED" : "NICE"}
                          </span>
                          <div>
                            <p className="text-gray-800">{phrase.text}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              from {phrase.jobTitle} at {phrase.company}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
