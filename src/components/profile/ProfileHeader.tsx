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
      <div className="space-y-s-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-s-3">
          <div>
            <label htmlFor="profile-name" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Name</label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-title" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Current title</label>
            <input
              id="profile-title"
              type="text"
              value={form.currentTitle}
              onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-location" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Location</label>
            <input
              id="profile-location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-reports-to" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Reports to</label>
            <input
              id="profile-reports-to"
              type="text"
              value={form.reportsTo}
              onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Phone</label>
            <input
              id="profile-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">Email</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-linkedin" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">LinkedIn</label>
            <input
              id="profile-linkedin"
              type="text"
              value={form.linkedin}
              onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="profile-github" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">GitHub</label>
            <input
              id="profile-github"
              type="text"
              value={form.github}
              onChange={(e) => setForm({ ...form, github: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-s-2">
          <button
            onClick={handleSave}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
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
        <h2 className="text-h2 font-light text-ink">{profile.name}</h2>
        {profile.currentTitle && (
          <p className="text-body text-ink-72 mt-0.5">{profile.currentTitle}</p>
        )}
        <div className="flex flex-wrap gap-x-s-3 gap-y-1 mt-s-1 font-mono text-list text-ink-50">
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
        className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
      >
        Edit
      </button>
    </div>
  );
}
