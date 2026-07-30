"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onRefresh: () => void;
}

export default function MetricsSection({ profile, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", value: "", source: "" });

  const handleAdd = async () => {
    setError(null);
    if (!form.label || !form.value) {
      setError("Label and value are required");
      return;
    }
    try {
      const res = await fetch("/api/profile/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          label: form.label,
          value: form.value,
          source: form.source || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add metric");
      }
      setForm({ label: "", value: "", source: "" });
      setAdding(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/profile/metrics?id=${id}`, { method: "DELETE" });
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
    <CollapsibleSection title="Metrics" badge={profile.profileMetrics.length}>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm mb-3" role="alert">
          {error}
        </div>
      )}

      {profile.profileMetrics.length === 0 && !adding && (
        <p className="text-sm text-gray-400 italic">No metrics added yet</p>
      )}

      {profile.profileMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          {profile.profileMetrics.map((m) => (
            <div key={m.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">{m.value}</p>
                  <p className="text-sm text-gray-600">{m.label}</p>
                  {m.source && (
                    <p className="text-xs text-gray-400 mt-0.5">{m.source}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="text-xs text-red-600 hover:text-red-800 cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                  aria-label={`Delete metric: ${m.label}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          + Add Metric
        </button>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="metric-label" className="block text-xs text-gray-500 mb-1">
                Label *
              </label>
              <input
                id="metric-label"
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="metric-value" className="block text-xs text-gray-500 mb-1">
                Value *
              </label>
              <input
                id="metric-value"
                type="text"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="metric-source" className="block text-xs text-gray-500 mb-1">
                Source
              </label>
              <input
                id="metric-source"
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Metric
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
