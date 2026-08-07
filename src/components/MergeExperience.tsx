"use client";

import { useState } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface Highlight {
  id?: string;
  text: string;
  category: string;
  metrics: string | null;
  keywords: string[];
  _selected: boolean;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string;
  industry: string | null;
  department: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  skills: { id: string; name: string }[];
  highlights: { id: string; text: string; category: string; metrics: string | null; keywords: string[] }[];
}

interface MergeExperienceProps {
  experiences: Experience[];
  onMerged: () => void;
  onCancel: () => void;
}

/**
 * Simple word-overlap similarity (0-1) for detecting near-duplicate highlights.
 */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size;
}

export default function MergeExperience({ experiences, onMerged, onCancel }: MergeExperienceProps) {
  // Pre-compute merged defaults
  const sortedByStart = [...experiences].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const sortedByEnd = [...experiences].sort((a, b) => (b.endDate || "9999").localeCompare(a.endDate || "9999"));

  const earliest = sortedByStart[0];
  const latest = sortedByEnd[0];

  const titleCounts = new Map<string, number>();
  for (const exp of experiences) {
    titleCounts.set(exp.title, (titleCounts.get(exp.title) || 0) + 1);
  }
  const bestTitle = [...titleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || experiences[0].title;

  const companyCounts = new Map<string, number>();
  for (const exp of experiences) {
    companyCounts.set(exp.company, (companyCounts.get(exp.company) || 0) + 1);
  }
  const bestCompany = [...companyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || experiences[0].company;

  // Merge all highlights, marking near-duplicates
  const allHighlights: Highlight[] = [];
  for (const exp of experiences) {
    for (const h of exp.highlights) {
      const isDup = allHighlights.some((existing) => similarity(existing.text, h.text) > 0.7);
      allHighlights.push({
        ...h,
        _selected: !isDup,
      });
    }
  }

  // Merge all skills (unique)
  const allSkillsSet = new Set<string>();
  for (const exp of experiences) {
    for (const s of exp.skills) {
      allSkillsSet.add(s.name);
    }
  }
  const allSkills = Array.from(allSkillsSet).sort();

  const bestLocation = experiences.find((e) => e.location)?.location || null;
  const bestDescription = experiences
    .map((e) => e.description)
    .filter(Boolean)
    .sort((a, b) => (b?.length || 0) - (a?.length || 0))[0] || null;

  // Form state
  const [title, setTitle] = useState(bestTitle);
  const [company, setCompany] = useState(bestCompany);
  const [location, setLocation] = useState(bestLocation || "");
  const [employmentType, setEmploymentType] = useState(experiences[0].employmentType);
  const [industry, setIndustry] = useState(experiences.find((e) => e.industry)?.industry || "");
  const [department, setDepartment] = useState(experiences.find((e) => e.department)?.department || "");
  const [startDate, setStartDate] = useState(formatForInput(earliest.startDate));
  const [endDate, setEndDate] = useState(latest.isCurrent ? "" : formatForInput(latest.endDate));
  const [isCurrent, setIsCurrent] = useState(experiences.some((e) => e.isCurrent));
  const [description, setDescription] = useState(bestDescription || "");
  const [highlights, setHighlights] = useState<Highlight[]>(allHighlights);
  const [skills, setSkills] = useState<string[]>(allSkills);
  const [skillInput, setSkillInput] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatForInput(dateStr: string | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const handleToggleHighlight = (index: number) => {
    setHighlights((prev) =>
      prev.map((h, i) => (i === index ? { ...h, _selected: !h._selected } : h))
    );
  };

  const handleSelectAllHighlights = () => {
    const allSelected = highlights.every((h) => h._selected);
    setHighlights((prev) => prev.map((h) => ({ ...h, _selected: !allSelected })));
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const selectedHighlights = highlights.filter((h) => h._selected);

      const res = await fetch("/api/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          location: location || null,
          employmentType,
          industry: industry || null,
          department: department || null,
          startDate,
          endDate: isCurrent ? null : endDate || null,
          isCurrent,
          description: description || null,
          skills,
          highlights: selectedHighlights.map((h) => ({
            text: h.text,
            category: h.category,
            metrics: h.metrics || "",
            keywords: h.keywords || [],
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(extractErrorMessage(data, `Failed to create merged role (${res.status})`));
        setIsSaving(false);
        return;
      }

      // Delete the original roles
      let deleteErrors = 0;
      for (const exp of experiences) {
        try {
          await fetch(`/api/experience/${exp.id}`, { method: "DELETE" });
        } catch {
          deleteErrors++;
        }
      }

      if (deleteErrors > 0) {
        console.warn(`${deleteErrors} original roles could not be deleted`);
      }

      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge");
      setIsSaving(false);
    }
  };

  const selectedHighlightCount = highlights.filter((h) => h._selected).length;

  return (
    <div className="border-t border-rule pt-s-3">
      <h2 className="text-h3 font-medium text-ink mb-s-1">Merge {experiences.length} roles</h2>
      <p className="text-body text-ink-72 mb-s-3">
        Confirm the details for the merged role. All unique highlights will be kept.
        Near-duplicates are auto-deselected but you can adjust.
      </p>

      {/* Source roles being merged */}
      <div className="mb-s-3 border-t border-rule pt-s-2">
        <p className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Merging from:</p>
        <ul className="text-body text-ink-72 space-y-s-1">
          {experiences.map((exp) => (
            <li key={exp.id}>
              {exp.title} at {exp.company} ({exp.highlights.length} highlights, {exp.skills.length} skills)
            </li>
          ))}
        </ul>
      </div>

      {/* Role Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-s-3 mb-s-3">
        <div>
          <label htmlFor="merge-title" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Job title</label>
          <input
            id="merge-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="merge-company" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Company</label>
          <input
            id="merge-company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="merge-location" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Location (optional)</label>
          <input
            id="merge-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="merge-type" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Employment type</label>
          <select
            id="merge-type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <div>
          <label htmlFor="merge-industry" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Industry (optional)</label>
          <input
            id="merge-industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="merge-department" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Department (optional)</label>
          <input
            id="merge-department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-s-3 mb-s-3 items-end">
        <div>
          <label htmlFor="merge-start" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Start date</label>
          <input
            id="merge-start"
            type="month"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="merge-end" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">End date (optional)</label>
          <input
            id="merge-end"
            type="month"
            value={endDate}
            disabled={isCurrent}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none disabled:text-ink-35"
          />
        </div>
        <div className="flex items-center gap-s-1 pb-s-1">
          <input
            id="merge-current"
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => { setIsCurrent(e.target.checked); if (e.target.checked) setEndDate(""); }}
            className="h-4 w-4 border-rule text-ink focus:outline-none"
          />
          <label htmlFor="merge-current" className="text-body text-ink">Current role</label>
        </div>
      </div>

      {/* Description */}
      <div className="mb-s-3">
        <label htmlFor="merge-desc" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">Role summary (optional)</label>
        <textarea
          id="merge-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
        />
      </div>

      {/* Skills */}
      <div className="mb-s-3">
        <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
          Skills ({skills.length})
        </label>
        <div className="flex gap-s-2 mb-s-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddSkill(); } }}
            placeholder="Add skill..."
            className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
          <button type="button" onClick={handleAddSkill} className="border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer text-meta">Add</button>
        </div>
        <p className="font-mono text-body text-ink-72">
          {skills.map((skill, i) => (
            <span key={skill}>
              <span className="underline cursor-pointer" onClick={() => handleRemoveSkill(skill)}>
                {skill}
              </span>
              {i < skills.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>

      {/* Highlights */}
      <div className="mb-s-3">
        <div className="flex items-center justify-between mb-s-1">
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50">
            Key highlights ({selectedHighlightCount} of {highlights.length} selected)
          </label>
          <button
            type="button"
            onClick={handleSelectAllHighlights}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
          >
            {highlights.every((h) => h._selected) ? "Deselect all" : "Select all"}
          </button>
        </div>
        <p className="text-meta text-ink-50 mb-s-2">
          Near-duplicates are auto-deselected. Check the ones you want to keep.
        </p>
        <div className="space-y-s-1 max-h-64 overflow-y-auto border-t border-rule pt-s-1">
          {highlights.map((h, i) => (
            <label
              key={i}
              className={`flex items-start gap-s-1 py-s-1 cursor-pointer border-b border-rule ${
                !h._selected ? "opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={h._selected}
                onChange={() => handleToggleHighlight(i)}
                className="h-4 w-4 mt-0.5 border-rule text-ink shrink-0 focus:outline-none"
              />
              <div className="flex-1 min-w-0">
                <span className="text-body text-ink-72">{h.text}</span>
                {h.metrics && (
                  <span className="font-mono text-meta text-ink-50 ml-s-1">({h.metrics})</span>
                )}
              </div>
              <span className="font-mono text-meta uppercase text-ink-50 shrink-0">
                {h.category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-s-3 border border-rule p-s-2 text-body text-ink" role="alert">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-s-3 border-t border-rule">
        <p className="font-mono text-meta text-ink-50">
          This will create 1 merged role and delete {experiences.length} originals.
        </p>
        <div className="flex gap-s-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title || !company || !startDate}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Merging..." : `Merge into 1 role (${selectedHighlightCount} highlights)`}
          </button>
        </div>
      </div>
    </div>
  );
}
