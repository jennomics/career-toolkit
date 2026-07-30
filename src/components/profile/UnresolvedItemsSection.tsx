"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onRefresh: () => void;
}

export default function UnresolvedItemsSection({ profile, onRefresh }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    section: "",
    description: "",
    optionA: "",
    optionB: "",
    priority: "medium",
  });

  const unresolvedCount = profile.unresolvedItems.filter((i) => !i.resolution).length;

  const handleResolve = async (id: string, resolution: string) => {
    setError(null);
    try {
      const res = await fetch("/api/profile/unresolved", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolution }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to resolve item");
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/profile/unresolved?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete");
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleAdd = async () => {
    setError(null);
    if (!form.section || !form.description || !form.optionA || !form.optionB) {
      setError("Section, description, and both options are required");
      return;
    }
    try {
      const res = await fetch("/api/profile/unresolved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, ...form }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add item");
      }
      setForm({ section: "", description: "", optionA: "", optionB: "", priority: "medium" });
      setAdding(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <CollapsibleSection
      title="Unresolved Items"
      badge={unresolvedCount > 0 ? `${unresolvedCount} unresolved` : undefined}
      badgeColor="bg-amber-100 text-amber-700"
      defaultOpen={unresolvedCount > 0}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm mb-3" role="alert">
          {error}
        </div>
      )}

      {unresolvedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4" role="alert">
          <p className="text-sm font-medium text-amber-800">
            {unresolvedCount} item{unresolvedCount !== 1 ? "s" : ""} still need a decision.
            Review each item below and select your preferred option.
          </p>
        </div>
      )}

      {profile.unresolvedItems.length === 0 && !adding && (
        <p className="text-sm text-gray-400 italic">No unresolved items</p>
      )}

      <div className="space-y-4">
        {profile.unresolvedItems.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-3 ${
              item.resolution
                ? "border-green-100 bg-green-50/50"
                : "border-amber-200 bg-amber-50/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  item.priority === "high"
                    ? "bg-red-100 text-red-700"
                    : item.priority === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {item.priority}
                </span>
                <span className="text-xs text-gray-500 ml-2">{item.section}</span>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs text-red-600 hover:text-red-800 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                aria-label={`Delete unresolved item: ${item.description}`}
              >
                Delete
              </button>
            </div>
            <p className="text-sm text-gray-900 mt-2 font-medium">{item.description}</p>

            {item.resolution ? (
              <p className="text-sm text-green-700 mt-2">
                Resolved: {item.resolution}
              </p>
            ) : (
              <div className="mt-3 flex flex-col sm:flex-row gap-2" role="group" aria-label={`Options for: ${item.description}`}>
                <button
                  onClick={() => handleResolve(item.id, item.optionA)}
                  className="flex-1 px-3 py-2 border border-blue-200 bg-blue-50 rounded text-sm
                    text-blue-800 hover:bg-blue-100 cursor-pointer font-medium
                    focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  aria-label={`Choose option A: ${item.optionA}`}
                >
                  A: {item.optionA}
                </button>
                <button
                  onClick={() => handleResolve(item.id, item.optionB)}
                  className="flex-1 px-3 py-2 border border-purple-200 bg-purple-50 rounded text-sm
                    text-purple-800 hover:bg-purple-100 cursor-pointer font-medium
                    focus:outline-none focus:ring-2 focus:ring-purple-500 text-left"
                  aria-label={`Choose option B: ${item.optionB}`}
                >
                  B: {item.optionB}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          + Add Unresolved Item
        </button>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="unresolved-section" className="block text-xs text-gray-500 mb-1">
                Section *
              </label>
              <input
                id="unresolved-section"
                type="text"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="unresolved-priority" className="block text-xs text-gray-500 mb-1">
                Priority
              </label>
              <select
                id="unresolved-priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="unresolved-desc" className="block text-xs text-gray-500 mb-1">
              Description *
            </label>
            <textarea
              id="unresolved-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="unresolved-a" className="block text-xs text-gray-500 mb-1">
                Option A *
              </label>
              <input
                id="unresolved-a"
                type="text"
                value={form.optionA}
                onChange={(e) => setForm({ ...form, optionA: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="unresolved-b" className="block text-xs text-gray-500 mb-1">
                Option B *
              </label>
              <input
                id="unresolved-b"
                type="text"
                value={form.optionB}
                onChange={(e) => setForm({ ...form, optionB: e.target.value })}
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
              Save Item
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
