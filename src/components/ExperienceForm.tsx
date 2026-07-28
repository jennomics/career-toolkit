"use client";

import { useState } from "react";

interface Highlight {
  text: string;
  category: string;
  metrics: string;
  keywords: string[];
}

interface ExperienceFormData {
  id?: string;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  industry: string;
  department: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  skills: string[];
  highlights: Highlight[];
}

interface ExperienceFormProps {
  initialData?: ExperienceFormData;
  onSave: () => void;
  onCancel: () => void;
}

const EMPTY_FORM: ExperienceFormData = {
  title: "",
  company: "",
  location: "",
  employmentType: "full-time",
  industry: "",
  department: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
  skills: [],
  highlights: [],
};

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
];

const HIGHLIGHT_CATEGORIES = [
  { value: "achievement", label: "Achievement" },
  { value: "responsibility", label: "Responsibility" },
  { value: "project", label: "Project" },
  { value: "award", label: "Award" },
];

export default function ExperienceForm({ initialData, onSave, onCancel }: ExperienceFormProps) {
  const [formData, setFormData] = useState<ExperienceFormData>(initialData || EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Highlight form state
  const [highlightText, setHighlightText] = useState("");
  const [highlightCategory, setHighlightCategory] = useState("achievement");
  const [highlightMetrics, setHighlightMetrics] = useState("");
  const [highlightKeywords, setHighlightKeywords] = useState("");

  const isEditing = !!formData.id;

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData({ ...formData, skills: [...formData.skills, trimmed] });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleAddHighlight = () => {
    if (!highlightText.trim()) return;
    const newHighlight: Highlight = {
      text: highlightText.trim(),
      category: highlightCategory,
      metrics: highlightMetrics.trim(),
      keywords: highlightKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    };
    setFormData({ ...formData, highlights: [...formData.highlights, newHighlight] });
    setHighlightText("");
    setHighlightMetrics("");
    setHighlightKeywords("");
  };

  const handleRemoveHighlight = (index: number) => {
    setFormData({
      ...formData,
      highlights: formData.highlights.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        company: formData.company,
        location: formData.location || null,
        employmentType: formData.employmentType,
        industry: formData.industry || null,
        department: formData.department || null,
        startDate: formData.startDate,
        endDate: formData.isCurrent ? null : formData.endDate || null,
        isCurrent: formData.isCurrent,
        description: formData.description || null,
        skills: formData.skills,
        highlights: formData.highlights,
      };

      const url = isEditing ? `/api/experience/${formData.id}` : "/api/experience";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Save failed (${res.status})`);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    }

    setIsSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold mb-1">
        {isEditing ? "Edit Experience" : "Add Experience"}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {isEditing
          ? "Update your work experience details."
          : "Add a role from your work history. Include highlights and skills for resume matching."}
      </p>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="exp-title" className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            id="exp-title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Senior Product Manager"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="exp-company" className="block text-sm font-medium text-gray-700 mb-1">
            Company *
          </label>
          <input
            id="exp-company"
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="e.g. Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="exp-location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            id="exp-location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. San Francisco, CA (or Remote)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="exp-type" className="block text-sm font-medium text-gray-700 mb-1">
            Employment Type
          </label>
          <select
            id="exp-type"
            value={formData.employmentType}
            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="exp-industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry
          </label>
          <input
            id="exp-industry"
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="e.g. Technology, Healthcare"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="exp-department" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <input
            id="exp-department"
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="e.g. Engineering, Product"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
        <div>
          <label htmlFor="exp-start" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            id="exp-start"
            type="month"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="exp-end" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            id="exp-end"
            type="month"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            disabled={formData.isCurrent}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 text-gray-900"
          />
        </div>

        <div className="flex items-center gap-2 pb-2">
          <input
            id="exp-current"
            type="checkbox"
            checked={formData.isCurrent}
            onChange={(e) =>
              setFormData({ ...formData, isCurrent: e.target.checked, endDate: "" })
            }
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="exp-current" className="text-sm text-gray-700">
            I currently work here
          </label>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="exp-description" className="block text-sm font-medium text-gray-700 mb-1">
          Role Summary
        </label>
        <textarea
          id="exp-description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief overview of your role and what you were responsible for..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>

      {/* Skills */}
      <div className="mb-4">
        <label htmlFor="exp-skill-input" className="block text-sm font-medium text-gray-700 mb-1">
          Skills & Technologies
        </label>
        <div className="flex gap-2">
          <input
            id="exp-skill-input"
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Type a skill and press Enter"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <button
            type="button"
            onClick={handleAddSkill}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm"
          >
            Add
          </button>
        </div>
        {formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-blue-400 hover:text-blue-700 cursor-pointer"
                  aria-label={`Remove skill: ${skill}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Highlights */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key Highlights & Achievements
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Add resume-ready bullet points. These will be available for resume building and job matching.
        </p>

        {/* Existing highlights */}
        {formData.highlights.length > 0 && (
          <ul className="space-y-2 mb-3">
            {formData.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-800 bg-gray-50 rounded-md p-2">
                <span
                  className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                    h.category === "achievement"
                      ? "bg-green-100 text-green-700"
                      : h.category === "project"
                      ? "bg-purple-100 text-purple-700"
                      : h.category === "award"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {h.category}
                </span>
                <span className="flex-1">{h.text}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(i)}
                  className="text-red-400 hover:text-red-600 cursor-pointer text-xs shrink-0"
                  aria-label={`Remove highlight: ${h.text.slice(0, 30)}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add highlight form */}
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <select
              value={highlightCategory}
              onChange={(e) => setHighlightCategory(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              aria-label="Highlight category"
            >
              {HIGHLIGHT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="e.g. Led cross-functional team of 8 to launch new product line"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={highlightMetrics}
              onChange={(e) => setHighlightMetrics(e.target.value)}
              placeholder="Metrics (e.g. increased revenue 40%)"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <input
              type="text"
              value={highlightKeywords}
              onChange={(e) => setHighlightKeywords(e.target.value)}
              placeholder="Keywords (comma-separated)"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="button"
              onClick={handleAddHighlight}
              disabled={!highlightText.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update Experience" : "Save Experience"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
