"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => void;
}

const FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "currentTitle", label: "Title" },
  { key: "location", label: "Location" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "reportsTo", label: "Reports To" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function IdentitySection({ profile, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const startEdit = () => {
    const d: Record<string, string> = {};
    FIELDS.forEach((f) => {
      d[f.key] = (profile[f.key as FieldKey] as string) || "";
    });
    setDraft(d);
    setEditing(true);
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <CollapsibleSection title="Identity & Contact" defaultOpen>
      {!editing ? (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={startEdit}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Edit identity and contact information"
            >
              Edit
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">
                  {f.label}
                </dt>
                <dd className="text-sm text-gray-900 mt-0.5">
                  {(profile[f.key as FieldKey] as string) || (
                    <span className="text-gray-400 italic">Not set</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label
                htmlFor={`identity-${f.key}`}
                className="block text-xs text-gray-500 uppercase tracking-wide mb-1"
              >
                {f.label}
                {"required" in f && f.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </label>
              <input
                id={`identity-${f.key}`}
                type="text"
                value={draft[f.key] || ""}
                onChange={(e) =>
                  setDraft({ ...draft, [f.key]: e.target.value })
                }
                className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:ring-offset-2"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
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
