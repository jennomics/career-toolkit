"use client";

import { useState, useRef } from "react";

interface WritingSample {
  id: string;
  title: string;
  content: string;
  context: string | null;
  register: string;
  createdAt: string;
}

interface WritingSamplesSectionProps {
  samples: WritingSample[];
  onAdd: (sample: { title: string; content: string; context?: string; register: string; file?: File }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MAX_SAMPLES_PER_REGISTER = 5;
const ALLOWED_FILE_EXTENSIONS = [".txt", ".md"];

export default function WritingSamplesSection({
  samples,
  onAdd,
  onDelete,
}: WritingSamplesSectionProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [context, setContext] = useState("");
  const [register, setRegister] = useState<string>("informal");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_FILE_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
      setFileError("Only .txt and .md files are supported.");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;

    if (inputMode === "paste" && !content.trim()) return;
    if (inputMode === "upload" && !selectedFile) return;

    if (inputMode === "upload" && selectedFile) {
      await onAdd({
        title: title.trim(),
        content: "",
        context: context.trim() || undefined,
        register,
        file: selectedFile,
      });
    } else {
      await onAdd({
        title: title.trim(),
        content: content.trim(),
        context: context.trim() || undefined,
        register,
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setContext("");
    setRegister("informal");
    setInputMode("paste");
    setSelectedFile(null);
    setFileError(null);
    setAdding(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const informalSamples = samples.filter((s) => s.register !== "formal");
  const formalSamples = samples.filter((s) => s.register === "formal");

  const informalCount = informalSamples.length;
  const formalCount = formalSamples.length;

  const canAddInformal = informalCount < MAX_SAMPLES_PER_REGISTER;
  const canAddFormal = formalCount < MAX_SAMPLES_PER_REGISTER;
  const canAddAny = canAddInformal || canAddFormal;

  const isAddDisabled =
    !title.trim() ||
    (inputMode === "paste" && !content.trim()) ||
    (inputMode === "upload" && !selectedFile);

  const renderSampleList = (sampleList: WritingSample[]) => (
    <div className="space-y-0">
      {sampleList.map((sample) => (
        <div
          key={sample.id}
          className="border-t border-rule py-s-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <button
                onClick={() =>
                  setExpanded(expanded === sample.id ? null : sample.id)
                }
                className="text-body font-medium text-ink text-left min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
                aria-expanded={expanded === sample.id}
                aria-label={`Toggle ${sample.title}`}
              >
                {sample.title}
              </button>
              {sample.context && (
                <p className="text-list text-ink-50 mt-0.5">
                  {sample.context}
                </p>
              )}
            </div>
            <button
              onClick={() => onDelete(sample.id)}
              aria-label={`Delete ${sample.title}`}
              className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-list"
            >
              Delete
            </button>
          </div>
          {expanded === sample.id && (
            <div className="mt-s-2 pt-s-2 border-t border-rule">
              <pre className="text-body text-ink-72 whitespace-pre-wrap font-zen">
                {sample.content}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Informal Register */}
      <div className="space-y-0">
        <h4 className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-s-1">
          Informal register ({informalCount}/{MAX_SAMPLES_PER_REGISTER})
        </h4>
        {informalSamples.length > 0 ? (
          renderSampleList(informalSamples)
        ) : (
          <p className="text-body text-ink-35">No informal writing samples yet.</p>
        )}
      </div>

      {/* Formal Register */}
      <div className="space-y-0">
        <h4 className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-s-1">
          Formal register ({formalCount}/{MAX_SAMPLES_PER_REGISTER})
        </h4>
        {formalSamples.length > 0 ? (
          renderSampleList(formalSamples)
        ) : (
          <p className="text-body text-ink-35">No formal writing samples yet.</p>
        )}
      </div>

      {adding ? (
        <div className="border-t border-rule pt-s-3 space-y-s-2">
          <div>
            <label htmlFor="sample-title" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Title
            </label>
            <input
              id="sample-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cover letter for Anthropic"
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="sample-register" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Register
            </label>
            <select
              id="sample-register"
              value={register}
              onChange={(e) => setRegister(e.target.value)}
              aria-label="Writing register"
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
            >
              <option value="informal" disabled={!canAddInformal}>
                Informal{!canAddInformal ? " (full)" : ""}
              </option>
              <option value="formal" disabled={!canAddFormal}>
                Formal{!canAddFormal ? " (full)" : ""}
              </option>
            </select>
          </div>
          <div>
            <label htmlFor="sample-context" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Context (optional)
            </label>
            <input
              id="sample-context"
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Written for Principal PM role, April 2025"
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>

          {/* Input mode toggle */}
          <div>
            <span className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Content source</span>
            <div className="flex gap-s-2" role="tablist" aria-label="Content input mode">
              <button
                role="tab"
                aria-selected={inputMode === "paste"}
                onClick={() => setInputMode("paste")}
                className={`font-mono text-meta cursor-pointer min-h-[var(--target-min)] inline-flex items-center px-s-2 ${
                  inputMode === "paste" ? "border-b-2 border-ink text-ink" : "text-ink-50"
                }`}
              >
                Paste text
              </button>
              <button
                role="tab"
                aria-selected={inputMode === "upload"}
                onClick={() => setInputMode("upload")}
                className={`font-mono text-meta cursor-pointer min-h-[var(--target-min)] inline-flex items-center px-s-2 ${
                  inputMode === "upload" ? "border-b-2 border-ink text-ink" : "text-ink-50"
                }`}
              >
                Upload file
              </button>
            </div>
          </div>

          {inputMode === "paste" ? (
            <div>
              <label htmlFor="sample-content" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Content
              </label>
              <textarea
                id="sample-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Paste the writing sample here..."
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none resize-none"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="sample-file" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Upload file (.txt or .md)
              </label>
              <input
                id="sample-file"
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleFileChange}
                aria-label="Upload writing sample file"
                className="w-full text-body text-ink"
              />
              {fileError && (
                <p className="text-meta text-live mt-1 font-mono" role="alert">
                  {fileError}
                </p>
              )}
              {selectedFile && !fileError && (
                <p className="font-mono text-meta text-ink-50 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-s-2">
            <button
              onClick={handleAdd}
              disabled={isAddDisabled}
              className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add sample
            </button>
            <button
              onClick={resetForm}
              className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        canAddAny && (
          <button
            onClick={() => setAdding(true)}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
          >
            Add writing sample
          </button>
        )
      )}

      {!canAddAny && !adding && (
        <p className="font-mono text-meta text-ink-50">
          Maximum of {MAX_SAMPLES_PER_REGISTER} writing samples per register reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}
