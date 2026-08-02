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
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-500">{label}</label>
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditValue(value || "");
              setEditing(false);
            }}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        {value ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        aria-label={`Edit ${label}`}
        className="shrink-0 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
      >
        Edit
      </button>
    </div>
  );
}
