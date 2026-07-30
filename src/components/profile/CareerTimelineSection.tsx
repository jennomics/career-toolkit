"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onRefresh: () => void;
}

export default function CareerTimelineSection({ profile, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    period: "",
    organization: "",
    title: "",
    scope: "",
    highlights: "",
    sortOrder: "0",
  });

  const handleAdd = async () => {
    setError(null);
    if (!form.period || !form.organization || !form.title) {
      setError("Period, organization, and title are required");
      return;
    }
    try {
      const res = await fetch("/api/profile/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          period: form.period,
          organization: form.organization,
          title: form.title,
          scope: form.scope || null,
          highlights: form.highlights
            ? form.highlights.split("\n").filter(Boolean)
            : [],
          sortOrder: parseInt(form.sortOrder) || 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add role");
      }
      setForm({ period: "", organization: "", title: "", scope: "", highlights: "", sortOrder: "0" });
      setAdding(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding role");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/profile/roles?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete role");
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting role");
    }
  };

  return (
    <CollapsibleSection
      title="Career Timeline"
      badge={profile.careerRoles.length}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm mb-3" role="alert">
          {error}
        </div>
      )}

      {profile.careerRoles.length === 0 && !adding && (
        <p className="text-sm text-gray-400 italic">No roles added yet</p>
      )}

      <div className="space-y-4">
        {profile.careerRoles.map((role) => (
          <div key={role.id} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{role.title}</p>
                <p className="text-sm text-gray-600">
                  {role.organization} &middot; {role.period}
                </p>
                {role.scope && (
                  <p className="text-xs text-gray-500 mt-1">{role.scope}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(role.id)}
                className="text-xs text-red-600 hover:text-red-800 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                aria-label={`Delete role ${role.title} at ${role.organization}`}
              >
                Delete
              </button>
            </div>
            {role.highlights.length > 0 && (
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {role.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-gray-700">{h}</li>
                ))}
              </ul>
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
          + Add Role
        </button>
      ) : (
        <div className="mt-3 border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="role-period" className="block text-xs text-gray-500 mb-1">
                Period *
              </label>
              <input
                id="role-period"
                type="text"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 2020-2023"
              />
            </div>
            <div>
              <label htmlFor="role-org" className="block text-xs text-gray-500 mb-1">
                Organization *
              </label>
              <input
                id="role-org"
                type="text"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="role-title" className="block text-xs text-gray-500 mb-1">
                Title *
              </label>
              <input
                id="role-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="role-sort" className="block text-xs text-gray-500 mb-1">
                Sort Order
              </label>
              <input
                id="role-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="role-scope" className="block text-xs text-gray-500 mb-1">
              Scope
            </label>
            <input
              id="role-scope"
              type="text"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="role-highlights" className="block text-xs text-gray-500 mb-1">
              Highlights (one per line)
            </label>
            <textarea
              id="role-highlights"
              value={form.highlights}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              rows={3}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Role
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
