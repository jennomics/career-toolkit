"use client";

import { useState } from "react";

interface ArrayEditorProps {
  label: string;
  items: string[];
  onSave: (items: string[]) => void;
}

export default function ArrayEditor({ label, items, onSave }: ArrayEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(items);
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    if (newItem.trim()) {
      setDraft([...draft, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemove = (index: number) => {
    setDraft(draft.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(items);
    setNewItem("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <button
            onClick={() => { setDraft(items); setEditing(true); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={`Edit ${label}`}
          >
            Edit
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 italic">None added yet</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-gray-800">{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <span className="text-sm font-medium text-gray-700 block mb-2">
        {label}
      </span>
      <div className="space-y-2">
        {draft.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm text-gray-800 flex-1">{item}</span>
            <button
              onClick={() => handleRemove(i)}
              className="text-xs text-red-600 hover:text-red-800 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
              aria-label={`Remove ${item}`}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
            }}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`Add ${label.toLowerCase()}...`}
            aria-label={`New ${label.toLowerCase()} item`}
          />
          <button
            onClick={handleAdd}
            type="button"
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm
              hover:bg-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>
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
            onClick={handleCancel}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm
              hover:bg-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
