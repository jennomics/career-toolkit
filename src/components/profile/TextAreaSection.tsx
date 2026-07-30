"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";

interface Props {
  title: string;
  value: string | null;
  fieldName: string;
  onSave: (value: string | null) => void;
}

export default function TextAreaSection({ title, value, fieldName, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const handleSave = () => {
    onSave(draft || null);
    setEditing(false);
  };

  return (
    <CollapsibleSection title={title}>
      {!editing ? (
        <div>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => { setDraft(value || ""); setEditing(true); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={`Edit ${title}`}
            >
              Edit
            </button>
          </div>
          {value ? (
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
              {value}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 italic">Not set</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor={`textarea-${fieldName}`} className="sr-only">
            {title}
          </label>
          <textarea
            id={`textarea-${fieldName}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            aria-label={`${title} content`}
          />
          <div className="flex gap-2">
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
