"use client";

import { useState } from "react";

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
  onAdd: (sample: { title: string; content: string; context?: string; register: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MAX_SAMPLES = 5;

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

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) return;
    await onAdd({
      title: title.trim(),
      content: content.trim(),
      context: context.trim() || undefined,
      register,
    });
    setTitle("");
    setContent("");
    setContext("");
    setRegister("informal");
    setAdding(false);
  };

  const informalSamples = samples.filter((s) => s.register !== "formal");
  const formalSamples = samples.filter((s) => s.register === "formal");

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
        <h4 className="text-sm font-semibold text-gray-700">Informal Register</h4>
        {informalSamples.length > 0 ? (
          renderSampleList(informalSamples)
        ) : (
          <p className="text-sm text-gray-400 italic">No informal writing samples yet.</p>
        )}
      </div>

      {/* Formal Register */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Formal Register</h4>
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
              <option value="informal">Informal</option>
              <option value="formal">Formal</option>
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
          <div>
            <label htmlFor="sample-content" className="block text-xs font-medium text-gray-500 mb-1">
              Content (paste text)
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
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!title.trim() || !content.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Sample
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setTitle("");
                setContent("");
                setContext("");
                setRegister("informal");
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        samples.length < MAX_SAMPLES && (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            + Add Writing Sample ({samples.length}/{MAX_SAMPLES})
          </button>
        )
      )}

      {samples.length >= MAX_SAMPLES && !adding && (
        <p className="text-xs text-gray-500">
          Maximum of {MAX_SAMPLES} writing samples reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}
