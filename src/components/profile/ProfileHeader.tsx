"use client";

import { useState } from "react";

interface ProfileHeaderProps {
  profile: {
    name: string;
    location?: string | null;
    phone?: string | null;
    email?: string | null;
    linkedin?: string | null;
    github?: string | null;
    currentTitle?: string | null;
    reportsTo?: string | null;
  };
  onSave: (data: Record<string, string>) => Promise<void>;
}

export default function ProfileHeader({ profile, onSave }: ProfileHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: profile.name,
    location: profile.location || "",
    phone: profile.phone || "",
    email: profile.email || "",
    linkedin: profile.linkedin || "",
    github: profile.github || "",
    currentTitle: profile.currentTitle || "",
    reportsTo: profile.reportsTo || "",
  });

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-title" className="block text-xs font-medium text-gray-500 mb-1">Current Title</label>
            <input
              id="profile-title"
              type="text"
              value={form.currentTitle}
              onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-location" className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            <input
              id="profile-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-reports-to" className="block text-xs font-medium text-gray-500 mb-1">Reports To</label>
            <input
              id="profile-reports-to"
              type="text"
              value={form.reportsTo}
              onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input
              id="profile-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-linkedin" className="block text-xs font-medium text-gray-500 mb-1">LinkedIn</label>
            <input
              id="profile-linkedin"
              type="text"
              value={form.linkedin}
              onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-github" className="block text-xs font-medium text-gray-500 mb-1">GitHub</label>
            <input
              id="profile-github"
              type="text"
              value={form.github}
              onChange={(e) => setForm({ ...form, github: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
        {profile.currentTitle && (
          <p className="text-sm text-gray-600 mt-0.5">{profile.currentTitle}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
          {profile.location && <span>{profile.location}</span>}
          {profile.phone && <span>{profile.phone}</span>}
          {profile.email && <span>{profile.email}</span>}
          {profile.linkedin && <span>{profile.linkedin}</span>}
          {profile.github && <span>{profile.github}</span>}
          {profile.reportsTo && <span>Reports to: {profile.reportsTo}</span>}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        aria-label="Edit profile header"
        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
      >
        Edit
      </button>
    </div>
  );
}
