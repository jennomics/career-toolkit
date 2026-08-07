"use client";

import { useState } from "react";

interface TextFieldEditorProps {
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  label: string;
  multiline?: boolean;
  emptyMessage?: string;
}

export default function TextFieldEditor({
  value,
  onSave,
  label,
  multiline = false,
  emptyMessage = "Not set.",
}: TextFieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = async () => {
    await onSave(editValue);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-s-2">
        <label className="text-meta font-mono uppercase tracking-widest text-ink-50 block">{label}</label>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none resize-none"
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        )}
        <div className="flex gap-s-2">
          <button
            onClick={handleSave}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditValue(value || "");
              setEditing(false);
            }}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-s-3">
      <div>
        <p className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-0.5">{label}</p>
        {value ? (
          <p className="text-body text-ink-72 whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-body text-ink-35">{emptyMessage}</p>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        aria-label={`Edit ${label}`}
        className="shrink-0 text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
      >
        Edit
      </button>
    </div>
  );
}
