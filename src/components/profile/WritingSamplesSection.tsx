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
    <div className="space-y-3">
      {sampleList.map((sample) => (
        <div
          key={sample.id}
          className="border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <button
                onClick={() =>
                  setExpanded(expanded === sample.id ? null : sample.id)
                }
                className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left"
                aria-expanded={expanded === sample.id}
                aria-label={`Toggle ${sample.title}`}
              >
                {sample.title}
              </button>
              {sample.context && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {sample.context}
                </p>
              )}
            </div>
            <button
              onClick={() => onDelete(sample.id)}
              aria-label={`Delete ${sample.title}`}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
          {expanded === sample.id && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
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
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Informal Register ({informalCount}/{MAX_SAMPLES_PER_REGISTER})
        </h4>
        {informalSamples.length > 0 ? (
          renderSampleList(informalSamples)
        ) : (
          <p className="text-sm text-gray-400 italic">No informal writing samples yet.</p>
        )}
      </div>

      {/* Formal Register */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Formal Register ({formalCount}/{MAX_SAMPLES_PER_REGISTER})
        </h4>
        {formalSamples.length > 0 ? (
          renderSampleList(formalSamples)
        ) : (
          <p className="text-sm text-gray-400 italic">No formal writing samples yet.</p>
        )}
      </div>

      {adding ? (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label htmlFor="sample-title" className="block text-xs font-medium text-gray-500 mb-1">
              Title
            </label>
            <input
              id="sample-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cover letter for Anthropic"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="sample-register" className="block text-xs font-medium text-gray-500 mb-1">
              Register
            </label>
            <select
              id="sample-register"
              value={register}
              onChange={(e) => setRegister(e.target.value)}
              aria-label="Writing register"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label htmlFor="sample-context" className="block text-xs font-medium text-gray-500 mb-1">
              Context (optional)
            </label>
            <input
              id="sample-context"
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., Written for Principal PM role, April 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Input mode toggle */}
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">Content Source</span>
            <div className="flex gap-1 bg-gray-100 rounded-md p-0.5 w-fit" role="tablist" aria-label="Content input mode">
              <button
                role="tab"
                aria-selected={inputMode === "paste"}
                onClick={() => setInputMode("paste")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  inputMode === "paste"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Paste text
              </button>
              <button
                role="tab"
                aria-selected={inputMode === "upload"}
                onClick={() => setInputMode("upload")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  inputMode === "upload"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Upload file
              </button>
            </div>
          </div>

          {inputMode === "paste" ? (
            <div>
              <label htmlFor="sample-content" className="block text-xs font-medium text-gray-500 mb-1">
                Content
              </label>
              <textarea
                id="sample-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Paste the writing sample here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="sample-file" className="block text-xs font-medium text-gray-500 mb-1">
                Upload file (.txt or .md)
              </label>
              <input
                id="sample-file"
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleFileChange}
                aria-label="Upload writing sample file"
                className="w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileError && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {fileError}
                </p>
              )}
              {selectedFile && !fileError && (
                <p className="text-xs text-green-700 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isAddDisabled}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Sample
            </button>
            <button
              onClick={resetForm}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        canAddAny && (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            + Add Writing Sample
          </button>
        )
      )}

      {!canAddAny && !adding && (
        <p className="text-xs text-gray-500">
          Maximum of {MAX_SAMPLES_PER_REGISTER} writing samples per register reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}
