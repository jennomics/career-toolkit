"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Profile, SignatureStory } from "./types";

interface Props {
  profile: Profile;
  onRefresh: () => void;
}

const EMPTY_STORY = {
  title: "",
  situation: "",
  obstacle: "",
  action: "",
  result: "",
  whyItMatters: "",
};

export default function StoriesSection({ profile, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_STORY);

  const startEdit = (story: SignatureStory) => {
    setEditingId(story.id);
    setForm({
      title: story.title,
      situation: story.situation,
      obstacle: story.obstacle,
      action: story.action,
      result: story.result,
      whyItMatters: story.whyItMatters,
    });
  };

  const handleAdd = async () => {
    setError(null);
    const { title, situation, obstacle, action, result, whyItMatters } = form;
    if (!title || !situation || !obstacle || !action || !result || !whyItMatters) {
      setError("All fields are required");
      return;
    }
    try {
      const res = await fetch("/api/profile/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, ...form }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to add story");
      }
      setForm(EMPTY_STORY);
      setAdding(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleUpdate = async () => {
    setError(null);
    try {
      const res = await fetch("/api/profile/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update story");
      }
      setEditingId(null);
      setForm(EMPTY_STORY);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/profile/stories?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete");
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3 mt-3">
      {(["title", "situation", "obstacle", "action", "result", "whyItMatters"] as const).map((field) => (
        <div key={field}>
          <label htmlFor={`story-${field}`} className="block text-xs text-gray-500 mb-1 capitalize">
            {field === "whyItMatters" ? "Why It Matters" : field} *
          </label>
          <textarea
            id={`story-${field}`}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            rows={field === "title" ? 1 : 2}
            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
            hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:ring-offset-2"
        >
          {submitLabel}
        </button>
        <button
          onClick={() => { setAdding(false); setEditingId(null); setForm(EMPTY_STORY); }}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm
            hover:bg-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <CollapsibleSection
      title="Signature Stories"
      badge={profile.signatureStories.length}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm mb-3" role="alert">
          {error}
        </div>
      )}

      {profile.signatureStories.length === 0 && !adding && (
        <p className="text-sm text-gray-400 italic">No stories added yet</p>
      )}

      <div className="space-y-4">
        {profile.signatureStories.map((story) =>
          editingId === story.id ? (
            <div key={story.id}>{renderForm(handleUpdate, "Update Story")}</div>
          ) : (
            <div key={story.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-gray-900 text-sm">{story.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(story)}
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label={`Edit story: ${story.title}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="text-xs text-red-600 hover:text-red-800 cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    aria-label={`Delete story: ${story.title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                <p><span className="font-medium text-gray-500">Situation:</span> {story.situation}</p>
                <p><span className="font-medium text-gray-500">Obstacle:</span> {story.obstacle}</p>
                <p><span className="font-medium text-gray-500">Action:</span> {story.action}</p>
                <p><span className="font-medium text-gray-500">Result:</span> {story.result}</p>
                <p><span className="font-medium text-gray-500">Why it matters:</span> {story.whyItMatters}</p>
              </div>
            </div>
          )
        )}
      </div>

      {adding && renderForm(handleAdd, "Save Story")}

      {!adding && !editingId && (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          + Add Story
        </button>
      )}
    </CollapsibleSection>
  );
}
