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

  // Use the most common title, or the longest one
  const titleCounts = new Map<string, number>();
  for (const exp of experiences) {
    titleCounts.set(exp.title, (titleCounts.get(exp.title) || 0) + 1);
  }
  const bestTitle = [...titleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || experiences[0].title;

  // Use the most common company
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
        _selected: !isDup, // auto-deselect likely duplicates
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

  // Best location (most specific / non-null)
  const bestLocation = experiences.find((e) => e.location)?.location || null;

  // Best description (longest)
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
      // 1. Create the merged role
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

      // 2. Delete the original roles
      let deleteErrors = 0;
      for (const exp of experiences) {
        try {
          await fetch(`/api/experience/${exp.id}`, { method: "DELETE" });
        } catch {
          deleteErrors++;
        }
      }

      if (deleteErrors > 0) {
        // Non-fatal — merged role was created, some originals might remain
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-1">Merge {experiences.length} Roles</h2>
      <p className="text-sm text-gray-500 mb-4">
        Confirm the details for the merged role. All unique highlights will be kept.
        Near-duplicates are auto-deselected but you can adjust.
      </p>

      {/* Source roles being merged */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 font-medium mb-1">Merging from:</p>
        <ul className="text-xs text-gray-600 space-y-0.5">
          {experiences.map((exp) => (
            <li key={exp.id}>
              &bull; {exp.title} at {exp.company} ({exp.highlights.length} highlights, {exp.skills.length} skills)
            </li>
          ))}
        </ul>
      </div>

      {/* Role Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="merge-title" className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
          <input
            id="merge-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
        </div>
        <div>
          <label htmlFor="merge-company" className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            id="merge-company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
        </div>
        <div>
          <label htmlFor="merge-location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            id="merge-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
        </div>
        <div>
          <label htmlFor="merge-type" className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
          <select
            id="merge-type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <div>
          <label htmlFor="merge-industry" className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <input
            id="merge-industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
        </div>
        <div>
          <label htmlFor="merge-department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            id="merge-department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
        <div>
          <label htmlFor="merge-start" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            id="merge-start"
            type="month"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
          />
        </div>
        <div>
          <label htmlFor="merge-end" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            id="merge-end"
            type="month"
            value={endDate}
            disabled={isCurrent}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input
            id="merge-current"
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => { setIsCurrent(e.target.checked); if (e.target.checked) setEndDate(""); }}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="merge-current" className="text-sm text-gray-700">Current role</label>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="merge-desc" className="block text-sm font-medium text-gray-700 mb-1">Role Summary</label>
        <textarea
          id="merge-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
        />
      </div>

      {/* Skills */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skills ({skills.length})
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddSkill(); } }}
            placeholder="Add skill..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <button type="button" onClick={handleAddSkill} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm cursor-pointer hover:bg-gray-200">Add</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
              {skill}
              <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-blue-400 hover:text-blue-700 cursor-pointer" aria-label={`Remove ${skill}`}>&times;</button>
            </span>
          ))}
        </div>
      </div>

      {/* Highlights */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Key Highlights ({selectedHighlightCount} of {highlights.length} selected)
          </label>
          <button
            type="button"
            onClick={handleSelectAllHighlights}
            className="text-xs text-purple-600 hover:text-purple-800 cursor-pointer"
          >
            {highlights.every((h) => h._selected) ? "Deselect all" : "Select all"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-2">
          Near-duplicates are auto-deselected. Check the ones you want to keep.
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {highlights.map((h, i) => (
            <label
              key={i}
              className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                h._selected ? "bg-green-50" : "bg-gray-50 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={h._selected}
                onChange={() => handleToggleHighlight(i)}
                className="h-3.5 w-3.5 mt-0.5 text-green-600 rounded border-gray-300 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-700">{h.text}</span>
                {h.metrics && (
                  <span className="ml-1 text-xs text-green-600">({h.metrics})</span>
                )}
              </div>
              <span className={`text-[9px] px-1 py-0.5 rounded uppercase font-medium shrink-0 ${
                h.category === "achievement" ? "bg-green-100 text-green-700" :
                h.category === "project" ? "bg-purple-100 text-purple-700" :
                h.category === "award" ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {h.category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          This will create 1 merged role and delete {experiences.length} originals.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title || !company || !startDate}
            className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
          >
            {isSaving ? "Merging..." : `Merge into 1 Role (${selectedHighlightCount} highlights)`}
          </button>
        </div>
      </div>
    </div>
  );
}
