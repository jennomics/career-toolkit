"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onRefresh: () => void;
}

const MAX_SAMPLES = 5;

export default function WritingSamplesSection({ profile, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", context: "" });

  const atLimit = profile.writingSamples.length >= MAX_SAMPLES;

  const handleAdd = async () => {
    setError(null);
    if (!form.title || !form.content) {
      setError("Title and content are required");
      return;
    }
    try {
      const res = await fetch("/api/profile/writing-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          title: form.title,
          content: form.content,
          context: form.context || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add sample");
      }
      setForm({ title: "", content: "", context: "" });
      setAdding(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/profile/writing-samples?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete");
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <CollapsibleSection
      title="Writing Samples"
      badge={`${profile.writingSamples.length}/${MAX_SAMPLES}`}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm mb-3" role="alert">
          {error}
        </div>
      )}

      {atLimit && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-blue-700 text-sm mb-3" role="status">
          Maximum of {MAX_SAMPLES} writing samples reached. Delete one to add another.
        </div>
      )}

      {profile.writingSamples.length === 0 && !adding && (
        <p className="text-sm text-gray-400 italic">No writing samples yet</p>
      )}

      <div className="space-y-3">
        {profile.writingSamples.map((sample) => (
          <div key={sample.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <button
                  onClick={() => setExpandedId(expandedId === sample.id ? null : sample.id)}
                  className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-blue-500 rounded text-left"
                  aria-expanded={expandedId === sample.id}
                  aria-label={`Toggle writing sample: ${sample.title}`}
                >
                  {sample.title}
                </button>
                {sample.context && (
                  <p className="text-xs text-gray-500 mt-0.5">{sample.context}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(sample.id)}
                className="text-xs text-red-600 hover:text-red-800 cursor-pointer ml-2
                  focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                aria-label={`Delete sample: ${sample.title}`}
              >
                Delete
              </button>
            </div>
            {expandedId !== sample.id && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {sample.content.slice(0, 150)}
                {sample.content.length > 150 && "..."}
              </p>
            )}
            {expandedId === sample.id && (
              <pre className="text-sm text-gray-800 mt-2 whitespace-pre-wrap font-sans bg-gray-50 rounded p-2">
                {sample.content}
              </pre>
            )}
          </div>
        ))}
      </div>

      {!adding && !atLimit && (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          + Add Writing Sample
        </button>
      )}

      {adding && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3 mt-3">
          <div>
            <label htmlFor="sample-title" className="block text-xs text-gray-500 mb-1">
              Title *
            </label>
            <input
              id="sample-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="sample-context" className="block text-xs text-gray-500 mb-1">
              Context (optional)
            </label>
            <input
              id="sample-context"
              type="text"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Blog post, email, report..."
            />
          </div>
          <div>
            <label htmlFor="sample-content" className="block text-xs text-gray-500 mb-1">
              Content * (paste text)
            </label>
            <textarea
              id="sample-content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="Paste your writing sample here..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Sample
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm
                hover:bg-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
