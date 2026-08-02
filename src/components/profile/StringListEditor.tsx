"use client";

import { useState } from "react";

interface StringListEditorProps {
  items: string[];
  onSave: (items: string[]) => Promise<void>;
  placeholder?: string;
  emptyMessage?: string;
}

export default function StringListEditor({
  items,
  onSave,
  placeholder = "Add new item...",
  emptyMessage = "No items yet.",
}: StringListEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<string[]>(items);
  const [newItem, setNewItem] = useState("");

  const handleSave = async () => {
    await onSave(editItems.filter((item) => item.trim()));
    setEditing(false);
  };

  const addItem = () => {
    if (newItem.trim()) {
      setEditItems([...editItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <ul className="space-y-2">
          {editItems.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <textarea
                value={item}
                onChange={(e) => {
                  const updated = [...editItems];
                  updated[index] = e.target.value;
                  setEditItems(updated);
                }}
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => removeItem(index)}
                aria-label={`Remove item ${index + 1}`}
                className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={addItem}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 border border-gray-200"
          >
            Add
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditItems(items);
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

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit items"
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit items"
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        >
          Edit
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-sm text-gray-700 pl-4 border-l-2 border-gray-200"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
