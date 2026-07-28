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
}

interface ResumeUploadProps {
  onSaved: () => void;
}

type UploadStep = "upload" | "extracting" | "review" | "saving";
type InputMode = "file" | "paste";

export default function ResumeUpload({ onSaved }: ResumeUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<UploadStep>("upload");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [extracted, setExtracted] = useState<ExtractedExperience[]>([]);
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 });

  const handleExtract = async () => {
    setError(null);
    setStep("extracting");

    try {
      const formData = new FormData();
      if (inputMode === "file" && file) {
        formData.append("file", file);
      } else if (inputMode === "paste") {
        formData.append("text", pastedText);
      }

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
        setError(data.summary || "No experience entries found in this document.");
        setStep("upload");
        return;
      }

      // Mark all as selected by default
      const withSelection = data.experiences.map((exp: Omit<ExtractedExperience, "_selected">) => ({
        ...exp,
        _selected: true,
      }));

      setExtracted(withSelection);
      setSummary(data.summary || `Found ${withSelection.length} roles`);
      setStep("review");
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
      // Done - reset and notify parent
      handleReset();
      onSaved();
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
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
        Upload a Resume to Extract Experience
      </button>
    );
  }

  // ─── UPLOAD STEP ──────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Upload a Resume</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a PDF, Word doc, or paste text from an old resume. I&apos;ll extract your work history automatically.
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
            Upload File
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
              htmlFor="resume-file"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-gray-50"
              }`}
            >
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-700">{file.name}</p>
                  <p className="text-xs text-blue-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT (max 5MB)</p>
                </div>
              )}
              <input
                id="resume-file"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size > 5 * 1024 * 1024) {
                    setError("File too large (max 5MB)");
                    return;
                  }
                  setFile(f || null);
                  setError(null);
                }}
              />
            </label>
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
              (inputMode === "file" && !file) ||
              (inputMode === "paste" && pastedText.length < 20)
            }
            className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            Extract Experience
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
        <p className="text-gray-600 mt-4 text-sm">Extracting experience from your resume...</p>
        <p className="text-gray-400 text-xs mt-1">This may take 10-20 seconds</p>
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
        Select the entries you want to save. Uncheck any that are incorrect or duplicates.
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
          Select all ({extracted.length})
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
              </div>
              <p className="text-xs text-gray-600">
                {exp.company}
                {exp.location && ` \u2022 ${exp.location}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(exp.startDate)} &ndash; {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                {exp.employmentType !== "full-time" && ` \u2022 ${exp.employmentType}`}
              </p>

              {/* Skills */}
              {exp.skills && exp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {exp.skills.slice(0, 8).map((skill) => (
                    <span key={skill} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
                      {skill}
                    </span>
                  ))}
                  {exp.skills.length > 8 && (
                    <span className="px-1.5 py-0.5 text-gray-400 text-[10px]">
                      +{exp.skills.length - 8} more
                    </span>
                  )}
                </div>
              )}

              {/* Highlights preview */}
              {exp.highlights && exp.highlights.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">
                    {exp.highlights.length} highlight{exp.highlights.length !== 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-0.5">
                    {exp.highlights.slice(0, 3).map((h, j) => (
                      <li key={j} className="text-xs text-gray-600 truncate">
                        &bull; {h.text}
                      </li>
                    ))}
                    {exp.highlights.length > 3 && (
                      <li className="text-xs text-gray-400">
                        &bull; ...and {exp.highlights.length - 3} more
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
            Save {selectedCount} {selectedCount === 1 ? "Entry" : "Entries"}
          </button>
        </div>
      </div>
    </div>
  );
}
