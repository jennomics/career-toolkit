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
      <div className="space-y-s-2">
        <ul className="space-y-s-1">
          {editItems.map((item, index) => (
            <li key={index} className="flex items-start gap-s-2 border-t border-rule pt-s-1">
              <textarea
                value={item}
                onChange={(e) => {
                  const updated = [...editItems];
                  updated[index] = e.target.value;
                  setEditItems(updated);
                }}
                rows={2}
                className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none resize-none"
              />
              <button
                onClick={() => removeItem(index)}
                aria-label={`Remove item ${index + 1}`}
                className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-list"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-s-2">
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
            className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
          <button
            onClick={addItem}
            className="border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer"
          >
            Add
          </button>
        </div>
        <div className="flex gap-s-2">
          <button
            onClick={handleSave}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditItems(items);
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

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-body text-ink-35">{emptyMessage}</p>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit items"
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-s-1">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit items"
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          Edit
        </button>
      </div>
      <ul className="space-y-0">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-list text-ink-72 pl-s-2 border-l border-rule py-s-1"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
