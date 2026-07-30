"use client";

import { useState } from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import ArrayEditor from "./ArrayEditor";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => void;
}

export default function SearchParametersSection({ profile, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [targetLevel, setTargetLevel] = useState(profile.searchTargetLevel || "");
  const [geography, setGeography] = useState(profile.searchGeography || "");

  const handleSaveText = () => {
    onSave({
      searchTargetLevel: targetLevel || null,
      searchGeography: geography || null,
    });
    setEditing(false);
  };

  return (
    <CollapsibleSection title="Search Parameters">
      {!editing ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setTargetLevel(profile.searchTargetLevel || "");
                setGeography(profile.searchGeography || "");
                setEditing(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Edit search parameters"
            >
              Edit Level & Geography
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Target Level</dt>
              <dd className="text-sm text-gray-900 mt-0.5">
                {profile.searchTargetLevel || <span className="text-gray-400 italic">Not set</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Geography</dt>
              <dd className="text-sm text-gray-900 mt-0.5">
                {profile.searchGeography || <span className="text-gray-400 italic">Not set</span>}
              </dd>
            </div>
          </dl>
          <ArrayEditor
            label="Target Companies"
            items={profile.searchCompanies}
            onSave={(items) => onSave({ searchCompanies: items })}
          />
          <ArrayEditor
            label="Target Firms"
            items={profile.searchFirms}
            onSave={(items) => onSave({ searchFirms: items })}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="search-level" className="block text-xs text-gray-500 mb-1">
              Target Level
            </label>
            <input
              id="search-level"
              type="text"
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="search-geo" className="block text-xs text-gray-500 mb-1">
              Geography
            </label>
            <input
              id="search-geo"
              type="text"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveText}
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
