"use client";

import { useState } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { CompanyData } from "./page";

interface ResumeTabProps {
  company: CompanyData;
}

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
  keySkills: string[];
  additionalQualifications: string[];
  generatedAt: string;
  source: string;
  mode?: string;
  stats?: {
    jobsAnalyzed: number;
    experienceRoles?: number;
    phrasesConsidered: number;
    keywordsAvailable: number;
  };
}

function formatResumeDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ResumeTab({ company }: ResumeTabProps) {
  const [mode, setMode] = useState<"targeted" | "generic">("targeted");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (mode === "targeted" && !selectedJobId) return;

    setIsGenerating(true);
    setError(null);
    setResume(null);

    try {
      const payload: Record<string, unknown> = {
        companySlug: company.slug,
        mode,
      };
      if (mode === "targeted" && selectedJobId) {
        payload.jobId = selectedJobId;
      }

      const res = await fetch("/api/resume/generate-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(extractErrorMessage(data, `Generation failed (${res.status})`));
        return;
      }

      setResume(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsGenerating(false);
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
          ? `${formatResumeDate(role.startDate)} - Present`
          : `${formatResumeDate(role.startDate)} - ${role.endDate ? formatResumeDate(role.endDate) : "Present"}`;
        sections.push(`\n### ${role.title} | ${role.company}${role.location ? ` | ${role.location}` : ""}`);
        sections.push(dateRange);
        for (const bullet of role.bullets) {
          sections.push(`- ${bullet}`);
        }
      }
    }

    sections.push("", "## Key Skills", resume.keySkills.join(" | "));

    if (resume.additionalQualifications.length > 0) {
      sections.push("", "## Additional Qualifications");
      for (const q of resume.additionalQualifications) {
        sections.push(`- ${q}`);
      }
    }

    navigator.clipboard.writeText(sections.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      {/* Mode selection */}
      <div className="border-t border-rule pt-s-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMode("targeted")}
            className={`px-3 py-1.5 text-sm font-medium cursor-pointer ${
              mode === "targeted"
                ? "font-mono text-meta text-ink-50 border border-rule"
                : "border border-ink text-ink bg-transparent"
            }`}
          >
            Targeted (for a specific job)
          </button>
          <button
            type="button"
            onClick={() => setMode("generic")}
            className={`px-3 py-1.5 text-sm font-medium cursor-pointer ${
              mode === "generic"
                ? "font-mono text-meta text-ink-50 border "
                : "border border-ink text-ink bg-transparent"
            }`}
          >
            Generic (for all jobs at this company)
          </button>
        </div>

        {mode === "targeted" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-72 mb-2">
              Select a job at {company.name}
            </label>
            {company.jobs.length === 0 ? (
              <p className="text-sm text-ink-35">No jobs for this company yet.</p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-2.5 border border-rule text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
              >
                <option value="">Choose a job...</option>
                {company.jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === "generic" && (
          <div className=" border  p-4 mb-4">
            <p className="text-xs text-ink-50">
              Generates a resume optimized for all {company.jobs.length} jobs at {company.name}.
              {company.notes ? " Company intelligence will be included in the context." : ""}
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (mode === "targeted" && !selectedJobId)}
          className="px-6 py-2.5 border-[1.5px] border-live text-live bg-transparent text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGenerating ? "Generating..." : "Generate Resume"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-rule p-s-3 text-ink text-body" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {isGenerating && (
        <div className="text-center py-12">
          <div className="inline-block w-6 h-6 border-2 border-ink border-t-transparent animate-spin" role="status" aria-label="Generating resume" />
          <p className="text-ink-50 mt-3 text-sm">Generating company-scoped resume...</p>
        </div>
      )}

      {/* Generated resume */}
      {resume && (
        <div className="border-t border-rule overflow-hidden">
          <div className="bg-paper border-b border-rule px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-ink-72">
                Resume for: <span className="text-ink">{resume.targetRole}</span>
              </h2>
              {resume.stats && (
                <span className="text-xs text-ink-35">
                  ({resume.stats.experienceRoles ? `${resume.stats.experienceRoles} roles, ` : ""}{resume.stats.jobsAnalyzed} jobs analyzed)
                </span>
              )}
            </div>
            <button
              onClick={copyToClipboard}
              className="text-xs text-ink underline font-medium cursor-pointer"
            >
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Summary */}
            <section>
              <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-2">
                Professional Summary
              </h3>
              <p className="text-sm text-ink-72 leading-relaxed">{resume.summary}</p>
            </section>

            {/* Work Experience */}
            {resume.workExperience && resume.workExperience.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-3">
                  Work Experience
                </h3>
                <div className="space-y-5">
                  {resume.workExperience.map((role, i) => (
                    <div key={i} className="border-l-2  pl-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-sm font-semibold text-ink">{role.title}</h4>
                        <span className="text-xs text-ink-35 shrink-0">
                          {formatResumeDate(role.startDate)} - {role.isCurrent ? "Present" : role.endDate ? formatResumeDate(role.endDate) : "Present"}
                        </span>
                      </div>
                      <p className="text-sm text-ink-72 mb-1.5">{role.company}{role.location ? ` - ${role.location}` : ""}</p>
                      {role.bullets.length > 0 && (
                        <ul className="space-y-1">
                          {role.bullets.map((bullet, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-ink-72">
                              <span className="text-ink-50 mt-1 shrink-0">&#x2022;</span>
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

            {/* Key Skills */}
            {resume.keySkills.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-2">
                  Key Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resume.keySkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 font-mono text-meta text-ink-50 text-xs font-medium"
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
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-2">
                  Additional Qualifications
                </h3>
                <ul className="space-y-1.5">
                  {resume.additionalQualifications.map((qual, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-72">
                      <span className="text-ink-50 mt-1 shrink-0">&#x2022;</span>
                      <span>{qual}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="bg-paper border-t border-rule px-6 py-3">
            <p className="text-xs text-ink-35">
              Generated {new Date(resume.generatedAt).toLocaleString()} via {resume.source} ({resume.mode} mode for {company.name})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
