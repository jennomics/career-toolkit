"use client";

import { useState } from "react";

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
  _sources: string[]; // which files this role was found in
}

interface ResumeUploadProps {
  onSaved: () => void;
}

type UploadStep = "upload" | "extracting" | "review" | "saving";
type InputMode = "file" | "paste";

/**
 * Generates a key for deduplicating roles.
 * Two roles are considered the same if title + company match (case-insensitive).
 */
function roleKey(title: string, company: string): string {
  return `${title.toLowerCase().trim()}|||${company.toLowerCase().trim()}`;
}

/**
 * Merges extracted experiences from multiple resumes.
 * Same role (by title+company) accumulates all unique highlights and skills.
 */
function mergeExperiences(
  existing: ExtractedExperience[],
  incoming: ExtractedExperience[],
  sourceName: string
): ExtractedExperience[] {
  const merged = new Map<string, ExtractedExperience>();

  // Index existing
  for (const exp of existing) {
    merged.set(roleKey(exp.title, exp.company), exp);
  }

  // Merge incoming
  for (const exp of incoming) {
    const key = roleKey(exp.title, exp.company);
    const existing = merged.get(key);

    if (existing) {
      // Merge highlights — add any that are substantially different
      for (const h of exp.highlights) {
        const isDuplicate = existing.highlights.some(
          (eh) => similarity(eh.text, h.text) > 0.8
        );
        if (!isDuplicate) {
          existing.highlights.push(h);
        }
      }

      // Merge skills — add new ones
      for (const skill of exp.skills) {
        if (!existing.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
          existing.skills.push(skill);
        }
      }

      // Track source
      if (!existing._sources.includes(sourceName)) {
        existing._sources.push(sourceName);
      }

      // Use longer description
      if (exp.description && (!existing.description || exp.description.length > existing.description.length)) {
        existing.description = exp.description;
      }

      // Use more specific location
      if (exp.location && !existing.location) {
        existing.location = exp.location;
      }
    } else {
      // New role
      merged.set(key, {
        ...exp,
        _selected: true,
        _sources: [sourceName],
      });
    }
  }

  return Array.from(merged.values());
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
        // Multi-file batch extraction
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
            // If one file fails, continue with the others
          } catch {
            // Skip failed file, continue
          }
        }

        setExtractProgress({ done: files.length, total: files.length, current: "" });

        if (merged.length === 0) {
          setError("No experience entries found in any of the uploaded files.");
          setStep("upload");
          return;
        }

        // Sort by start date (most recent first)
        merged.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

        setExtracted(merged);
        const totalHighlights = merged.reduce((sum, r) => sum + r.highlights.length, 0);
        const totalSkills = new Set(merged.flatMap((r) => r.skills.map((s) => s.toLowerCase()))).size;
        setSummary(
          `${merged.length} roles, ${totalHighlights} highlights, ${totalSkills} skills from ${files.length} file${files.length > 1 ? "s" : ""}`
        );
        setStep("review");
      } else if (inputMode === "paste") {
        // Single text extraction
        setExtractProgress({ done: 0, total: 1, current: "pasted text" });

        const formData = new FormData();
        formData.append("text", pastedText);

        const res = await fetch("/api/experience/extract", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || `Extraction failed (${res.status})`);
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
        // Continue saving others even if one fails
      }
    }

    if (savedCount === 0) {
      setError("Failed to save any entries. The database may need setup (npx prisma db push).");
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
        className="w-full p-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-500 hover:border-purple-400 hover:text-purple-600 transition-colors cursor-pointer bg-purple-50/50"
      >
        Upload Resumes to Extract Experience
      </button>
    );
  }

  // ─── UPLOAD STEP ──────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Upload Resumes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload multiple resumes (PDF, Word, or text). I&apos;ll extract your work history from all of them, merge duplicates, and accumulate all unique highlights and skills.
        </p>

        {/* Input mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4" role="radiogroup" aria-label="Input method">
          <button
            type="button"
            role="radio"
            aria-checked={inputMode === "file"}
            onClick={() => setInputMode("file")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              inputMode === "file" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Upload Files
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={inputMode === "paste"}
            onClick={() => setInputMode("paste")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              inputMode === "paste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Paste Text
          </button>
        </div>

        {inputMode === "file" && (
          <div className="space-y-3">
            <label
              htmlFor="resume-files"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                files.length > 0 ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
              }`}
            >
              {files.length > 0 ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">
                    {files.length} file{files.length > 1 ? "s" : ""} selected
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {files.map((f) => f.name).join(", ")}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-500">Click to select files (or drag and drop)</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT &mdash; select multiple</p>
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
              <ul className="text-xs text-gray-500 space-y-0.5">
                {files.map((f, i) => (
                  <li key={i}>&bull; {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleExtract}
            disabled={
              (inputMode === "file" && files.length === 0) ||
              (inputMode === "paste" && pastedText.length < 20)
            }
            className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            Extract Experience{files.length > 1 ? ` from ${files.length} Files` : ""}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ─── EXTRACTING STEP ──────────────────────────────────────────────────────────
  if (step === "extracting") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
        <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Extracting experience" />
        <p className="text-gray-600 mt-4 text-sm">
          Extracting experience from {extractProgress.total > 1 ? `file ${extractProgress.done + 1} of ${extractProgress.total}` : "your resume"}...
        </p>
        {extractProgress.current && (
          <p className="text-gray-400 text-xs mt-1 truncate max-w-xs mx-auto">{extractProgress.current}</p>
        )}
        {extractProgress.total > 1 && (
          <div className="w-48 mx-auto mt-3 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(extractProgress.done / extractProgress.total) * 100}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ─── SAVING STEP ──────────────────────────────────────────────────────────────
  if (step === "saving") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center">
        <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" role="status" aria-label="Saving experience" />
        <p className="text-gray-600 mt-4 text-sm">
          Saving experience entries... ({saveProgress.saved}/{saveProgress.total})
        </p>
      </div>
    );
  }

  // ─── REVIEW STEP ──────────────────────────────────────────────────────────────
  const selectedCount = extracted.filter((e) => e._selected).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Review Extracted Experience</h2>
        <span className="text-xs text-gray-400">{summary}</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Roles have been merged across resumes. All unique highlights and skills are accumulated. Uncheck any you don&apos;t want.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Select all toggle */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
        <input
          type="checkbox"
          id="select-all"
          checked={extracted.every((e) => e._selected)}
          onChange={handleSelectAll}
          className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
        />
        <label htmlFor="select-all" className="text-sm text-gray-700 font-medium">
          Select all ({extracted.length} roles)
        </label>
      </div>

      {/* Experience list */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {extracted.map((exp, i) => (
          <label
            key={i}
            className={`flex gap-3 p-4 rounded-lg cursor-pointer transition-colors border ${
              exp._selected
                ? "bg-purple-50 border-purple-200"
                : "bg-gray-50 border-gray-200 opacity-60"
            }`}
          >
            <input
              type="checkbox"
              checked={exp._selected}
              onChange={() => handleToggleSelect(i)}
              className="h-4 w-4 mt-1 text-purple-600 rounded border-gray-300 focus:ring-purple-500 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{exp.title}</h3>
                {exp.isCurrent && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                    Current
                  </span>
                )}
                {exp._sources.length > 1 && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                    {exp._sources.length} sources
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">
                {exp.company}
                {exp.location && ` \u2022 ${exp.location}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(exp.startDate)} &ndash; {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                {exp.employmentType !== "full-time" && ` \u2022 ${exp.employmentType}`}
              </p>

              {/* Source files */}
              {exp._sources.length > 1 && (
                <p className="text-[10px] text-purple-500 mt-1">
                  Found in: {exp._sources.join(", ")}
                </p>
              )}

              {/* Skills */}
              {exp.skills && exp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {exp.skills.slice(0, 10).map((skill) => (
                    <span key={skill} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
                      {skill}
                    </span>
                  ))}
                  {exp.skills.length > 10 && (
                    <span className="px-1.5 py-0.5 text-gray-400 text-[10px]">
                      +{exp.skills.length - 10} more
                    </span>
                  )}
                </div>
              )}

              {/* Highlights preview */}
              {exp.highlights && exp.highlights.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">
                    {exp.highlights.length} highlight{exp.highlights.length !== 1 ? "s" : ""} (merged)
                  </p>
                  <ul className="space-y-0.5">
                    {exp.highlights.slice(0, 5).map((h, j) => (
                      <li key={j} className="text-xs text-gray-600 truncate">
                        &bull; {h.text}
                      </li>
                    ))}
                    {exp.highlights.length > 5 && (
                      <li className="text-xs text-gray-400">
                        &bull; ...and {exp.highlights.length - 5} more
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
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-500">
          {selectedCount} of {extracted.length} selected
        </span>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSelected}
            disabled={selectedCount === 0}
            className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            Save {selectedCount} {selectedCount === 1 ? "Role" : "Roles"} (with all highlights)
          </button>
        </div>
      </div>
    </div>
  );
}
