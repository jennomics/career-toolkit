"use client";

import { useState } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface ExtractedHighlight {
  text: string;
  category: string;
  metrics: string;
  keywords: string[];
}

interface ExtractedExperience {
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
  skills: string[];
  highlights: ExtractedHighlight[];
  // UI state
  _selected: boolean;
  _sources: string[];
}

interface ResumeUploadProps {
  onSaved: () => void;
}

type UploadStep = "upload" | "extracting" | "review" | "saving";
type InputMode = "file" | "paste";

/**
 * Generates a key for deduplicating roles.
 */
function roleKey(title: string, company: string): string {
  return `${title.toLowerCase().trim()}|||${company.toLowerCase().trim()}`;
}

/**
 * Simple word-overlap similarity (0-1) for deduplicating highlights.
 */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

/**
 * Merges extracted experiences from multiple resumes.
 */
function mergeExperiences(
  existing: ExtractedExperience[],
  incoming: ExtractedExperience[],
  sourceName: string
): ExtractedExperience[] {
  const merged = new Map<string, ExtractedExperience>();

  for (const exp of existing) {
    merged.set(roleKey(exp.title, exp.company), exp);
  }

  for (const exp of incoming) {
    const key = roleKey(exp.title, exp.company);
    const existing = merged.get(key);

    if (existing) {
      for (const h of exp.highlights) {
        const isDuplicate = existing.highlights.some(
          (eh) => similarity(eh.text, h.text) > 0.8
        );
        if (!isDuplicate) {
          existing.highlights.push(h);
        }
      }

      for (const skill of exp.skills) {
        if (!existing.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
          existing.skills.push(skill);
        }
      }

      if (!existing._sources.includes(sourceName)) {
        existing._sources.push(sourceName);
      }

      if (exp.description && (!existing.description || exp.description.length > existing.description.length)) {
        existing.description = exp.description;
      }

      if (exp.location && !existing.location) {
        existing.location = exp.location;
      }
    } else {
      merged.set(key, {
        ...exp,
        _selected: true,
        _sources: [sourceName],
      });
    }
  }

  return Array.from(merged.values());
}

export default function ResumeUpload({ onSaved }: ResumeUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("upload");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [pastedText, setPastedText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [extracted, setExtracted] = useState<ExtractedExperience[]>([]);
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 });
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0, current: "" });

  const handleExtract = async () => {
    setError(null);
    setStep("extracting");

    try {
      if (inputMode === "file" && files.length > 0) {
        setExtractProgress({ done: 0, total: files.length, current: files[0].name });
        let merged: ExtractedExperience[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setExtractProgress({ done: i, total: files.length, current: file.name });

          const formData = new FormData();
          formData.append("file", file);

          try {
            const res = await fetch("/api/experience/extract", {
              method: "POST",
              body: formData,
            });

            const data = await res.json();

            if (res.ok && data.experiences && data.experiences.length > 0) {
              merged = mergeExperiences(merged, data.experiences, file.name);
            }
          } catch {
            // Skip failed file
          }
        }

        setExtractProgress({ done: files.length, total: files.length, current: "" });

        if (merged.length === 0) {
          setError("No experience entries found in any of the uploaded files.");
          setStep("upload");
          return;
        }

        merged.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

        setExtracted(merged);
        const totalHighlights = merged.reduce((sum, r) => sum + r.highlights.length, 0);
        const totalSkills = new Set(merged.flatMap((r) => r.skills.map((s) => s.toLowerCase()))).size;
        setSummary(
          `${merged.length} roles, ${totalHighlights} highlights, ${totalSkills} skills from ${files.length} file${files.length > 1 ? "s" : ""}`
        );
        setStep("review");
      } else if (inputMode === "paste") {
        setExtractProgress({ done: 0, total: 1, current: "pasted text" });

        const formData = new FormData();
        formData.append("text", pastedText);

        const res = await fetch("/api/experience/extract", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(extractErrorMessage(data, `Extraction failed (${res.status})`));
          setStep("upload");
          return;
        }

        if (!data.experiences || data.experiences.length === 0) {
          setError(data.summary || "No experience entries found.");
          setStep("upload");
          return;
        }

        const withSelection = data.experiences.map((exp: Omit<ExtractedExperience, "_selected" | "_sources">) => ({
          ...exp,
          _selected: true,
          _sources: ["pasted text"],
        }));

        setExtracted(withSelection);
        setSummary(data.summary || `Found ${withSelection.length} roles`);
        setStep("review");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStep("upload");
    }
  };

  const handleToggleSelect = (index: number) => {
    setExtracted((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, _selected: !exp._selected } : exp))
    );
  };

  const handleSelectAll = () => {
    const allSelected = extracted.every((e) => e._selected);
    setExtracted((prev) => prev.map((exp) => ({ ...exp, _selected: !allSelected })));
  };

  const handleSaveSelected = async () => {
    const selected = extracted.filter((e) => e._selected);
    if (selected.length === 0) return;

    setStep("saving");
    setSaveProgress({ saved: 0, total: selected.length });
    setError(null);

    let savedCount = 0;
    for (const exp of selected) {
      try {
        const res = await fetch("/api/experience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: exp.title,
            company: exp.company,
            location: exp.location,
            employmentType: exp.employmentType || "full-time",
            industry: exp.industry,
            department: exp.department,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent,
            description: exp.description,
            skills: exp.skills || [],
            highlights: (exp.highlights || []).map((h) => ({
              text: h.text,
              category: h.category || "achievement",
              metrics: h.metrics || "",
              keywords: h.keywords || [],
            })),
          }),
        });

        if (res.ok) {
          savedCount++;
          setSaveProgress({ saved: savedCount, total: selected.length });
        }
      } catch {
        // Continue saving others
      }
    }

    if (savedCount === 0) {
      setError("Failed to save any entries. The database may need setup (npx prisma migrate dev).");
      setStep("review");
    } else {
      handleReset();
      onSaved();
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setPastedText("");
    setExtracted([]);
    setSummary("");
    setError(null);
    setIsOpen(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Present";
    const [year, month] = dateStr.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month, 10) - 1] || ""} ${year}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full border border-ink border-dashed bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center justify-center cursor-pointer text-ink transition-colors"
      >
        Upload resumes to extract experience
      </button>
    );
  }

  // UPLOAD STEP
  if (step === "upload") {
    return (
      <div className="border-t border-rule pt-s-3">
        <h2 className="text-h3 font-medium text-ink mb-s-1">Upload resumes</h2>
        <p className="text-body text-ink-72 mb-s-3">
          Upload multiple resumes (PDF, Word, or text). Work history will be extracted from all of them, duplicates merged, and all unique highlights and skills accumulated.
        </p>

        {/* Input mode toggle */}
        <div className="flex items-center gap-s-3 mb-s-3" role="radiogroup" aria-label="Input method">
          <button
            type="button"
            role="radio"
            aria-checked={inputMode === "file"}
            onClick={() => setInputMode("file")}
            className={`text-ink min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta ${
              inputMode === "file" ? "underline font-medium" : "text-ink-50"
            }`}
          >
            Upload files
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={inputMode === "paste"}
            onClick={() => setInputMode("paste")}
            className={`text-ink min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta ${
              inputMode === "paste" ? "underline font-medium" : "text-ink-50"
            }`}
          >
            Paste text
          </button>
        </div>

        {inputMode === "file" && (
          <div className="space-y-s-2">
            <label
              htmlFor="resume-files"
              className={`flex flex-col items-center justify-center w-full h-32 border border-dashed cursor-pointer transition-colors ${
                files.length > 0 ? "border-ink" : "border-rule"
              }`}
            >
              {files.length > 0 ? (
                <div className="text-center">
                  <p className="text-body font-medium text-ink">
                    {files.length} file{files.length > 1 ? "s" : ""} selected
                  </p>
                  <p className="font-mono text-meta text-ink-50 mt-s-1">
                    {files.map((f) => f.name).join(", ")}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-body text-ink-72">Click to select files (or drag and drop)</p>
                  <p className="font-mono text-meta text-ink-50 mt-s-1">PDF, DOCX, or TXT - select multiple</p>
                </div>
              )}
              <input
                id="resume-files"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || []);
                  const oversized = selectedFiles.filter((f) => f.size > 20 * 1024 * 1024);
                  if (oversized.length > 0) {
                    setError(`${oversized.length} file(s) too large (max 20MB each): ${oversized.map((f) => f.name).join(", ")}`);
                    return;
                  }
                  setFiles(selectedFiles);
                  setError(null);
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="font-mono text-meta text-ink-50 space-y-s-1">
                {files.map((f, i) => (
                  <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {inputMode === "paste" && (
          <textarea
            rows={10}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none font-mono"
          />
        )}

        {error && (
          <div className="mt-s-2 border border-rule p-s-2 text-body text-ink" role="alert">
            {error}
          </div>
        )}

        <div className="flex gap-s-3 mt-s-3">
          <button
            onClick={handleExtract}
            disabled={
              (inputMode === "file" && files.length === 0) ||
              (inputMode === "paste" && pastedText.length < 20)
            }
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            Extract experience{files.length > 1 ? ` from ${files.length} files` : ""}
          </button>
          <button
            onClick={handleReset}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // EXTRACTING STEP
  if (step === "extracting") {
    return (
      <div className="border-t border-rule pt-s-3 text-center py-s-5">
        <p className="text-body text-ink-72">
          Extracting experience from {extractProgress.total > 1 ? `file ${extractProgress.done + 1} of ${extractProgress.total}` : "your resume"}...
        </p>
        {extractProgress.current && (
          <p className="font-mono text-meta text-ink-50 mt-s-1 truncate max-w-xs mx-auto">{extractProgress.current}</p>
        )}
        {extractProgress.total > 1 && (
          <div className="w-48 mx-auto mt-s-2 bg-rule h-[2px]">
            <div
              className="bg-ink h-[2px] transition-all"
              style={{ width: `${(extractProgress.done / extractProgress.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // SAVING STEP
  if (step === "saving") {
    return (
      <div className="border-t border-rule pt-s-3 text-center py-s-5">
        <p className="text-body text-ink-72">
          Saving experience entries... ({saveProgress.saved}/{saveProgress.total})
        </p>
      </div>
    );
  }

  // REVIEW STEP
  const selectedCount = extracted.filter((e) => e._selected).length;

  return (
    <div className="border-t border-rule pt-s-3">
      <div className="flex items-center justify-between mb-s-1">
        <h2 className="text-h3 font-medium text-ink">Review extracted experience</h2>
        <span className="font-mono text-meta text-ink-50">{summary}</span>
      </div>
      <p className="text-body text-ink-72 mb-s-3">
        Roles have been merged across resumes. All unique highlights and skills are accumulated. Uncheck any you do not want.
      </p>

      {error && (
        <div className="mb-s-3 border border-rule p-s-2 text-body text-ink" role="alert">
          {error}
        </div>
      )}

      {/* Select all toggle */}
      <div className="flex items-center gap-s-1 mb-s-2 pb-s-2 border-b border-rule">
        <input
          type="checkbox"
          id="select-all"
          checked={extracted.every((e) => e._selected)}
          onChange={handleSelectAll}
          className="h-4 w-4 border-rule text-ink focus:outline-none"
        />
        <label htmlFor="select-all" className="text-body text-ink font-medium">
          Select all ({extracted.length} roles)
        </label>
      </div>

      {/* Experience list */}
      <div className="space-y-s-1 max-h-[500px] overflow-y-auto">
        {extracted.map((exp, i) => (
          <label
            key={i}
            className={`flex gap-s-2 py-s-2 cursor-pointer border-t border-rule ${
              !exp._selected ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={exp._selected}
              onChange={() => handleToggleSelect(i)}
              className="h-4 w-4 mt-s-1 border-rule text-ink shrink-0 focus:outline-none"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-s-2 mb-0.5">
                <h3 className="text-body font-medium text-ink truncate">{exp.title}</h3>
                {exp.isCurrent && (
                  <span className="font-mono text-meta text-live">current</span>
                )}
                {exp._sources.length > 1 && (
                  <span className="font-mono text-meta text-ink-50">
                    {exp._sources.length} sources
                  </span>
                )}
              </div>
              <p className="text-body text-ink-72">
                {exp.company}
                {exp.location && ` / ${exp.location}`}
              </p>
              <p className="font-mono text-meta text-ink-50 mt-0.5">
                {formatDate(exp.startDate)} &ndash; {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                {exp.employmentType !== "full-time" && ` / ${exp.employmentType}`}
              </p>

              {exp._sources.length > 1 && (
                <p className="font-mono text-meta text-ink-35 mt-s-1">
                  Found in: {exp._sources.join(", ")}
                </p>
              )}

              {/* Skills */}
              {exp.skills && exp.skills.length > 0 && (
                <p className="font-mono text-meta text-ink-72 mt-s-1">
                  {exp.skills.slice(0, 10).join(", ")}
                  {exp.skills.length > 10 && ` +${exp.skills.length - 10} more`}
                </p>
              )}

              {/* Highlights preview */}
              {exp.highlights && exp.highlights.length > 0 && (
                <div className="mt-s-1">
                  <p className="font-mono text-meta uppercase text-ink-50">
                    {exp.highlights.length} highlight{exp.highlights.length !== 1 ? "s" : ""} (merged)
                  </p>
                  <ul className="space-y-0.5 mt-s-1">
                    {exp.highlights.slice(0, 5).map((h, j) => (
                      <li key={j} className="text-body text-ink-72 truncate">
                        {h.text}
                      </li>
                    ))}
                    {exp.highlights.length > 5 && (
                      <li className="text-meta text-ink-50">
                        ...and {exp.highlights.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-s-3 pt-s-3 border-t border-rule">
        <span className="font-mono text-meta text-ink-50">
          {selectedCount} of {extracted.length} selected
        </span>
        <div className="flex gap-s-3">
          <button
            onClick={handleReset}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSelected}
            disabled={selectedCount === 0}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            Save {selectedCount} {selectedCount === 1 ? "role" : "roles"} (with all highlights)
          </button>
        </div>
      </div>
    </div>
  );
}
