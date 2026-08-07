"use client";

import { useState } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

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
        setError(extractErrorMessage(data, `Save failed (${res.status})`));
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    }

    setIsSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-rule pt-s-3"
    >
      <h2 className="text-h3 font-medium text-ink mb-s-1">
        {isEditing ? "Edit experience" : "Add experience"}
      </h2>
      <p className="text-body text-ink-72 mb-s-3">
        {isEditing
          ? "Update your work experience details."
          : "Add a role from your work history. Include highlights and skills for resume matching."}
      </p>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-s-3 mb-s-3">
        <div>
          <label htmlFor="exp-title" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Job title
          </label>
          <input
            id="exp-title"
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Senior Product Manager"
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-company" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Company
          </label>
          <input
            id="exp-company"
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="e.g. Acme Corp"
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-location" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Location (optional)
          </label>
          <input
            id="exp-location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. San Francisco, CA (or Remote)"
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-type" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Employment type
          </label>
          <select
            id="exp-type"
            value={formData.employmentType}
            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="exp-industry" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Industry (optional)
          </label>
          <input
            id="exp-industry"
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="e.g. Technology, Healthcare"
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-department" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Department (optional)
          </label>
          <input
            id="exp-department"
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="e.g. Engineering, Product"
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-s-3 mb-s-3 items-end">
        <div>
          <label htmlFor="exp-start" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Start date
          </label>
          <input
            id="exp-start"
            type="month"
            required
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="exp-end" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            End date (optional)
          </label>
          <input
            id="exp-end"
            type="month"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            disabled={formData.isCurrent}
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none disabled:text-ink-35"
          />
        </div>

        <div className="flex items-center gap-s-1 pb-s-1">
          <input
            id="exp-current"
            type="checkbox"
            checked={formData.isCurrent}
            onChange={(e) =>
              setFormData({ ...formData, isCurrent: e.target.checked, endDate: "" })
            }
            className="h-4 w-4 border-rule text-ink focus:outline-none"
          />
          <label htmlFor="exp-current" className="text-body text-ink">
            I currently work here
          </label>
        </div>
      </div>

      {/* Description */}
      <div className="mb-s-3">
        <label htmlFor="exp-description" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
          Role summary (optional)
        </label>
        <textarea
          id="exp-description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief overview of your role and what you were responsible for..."
          className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
        />
      </div>

      {/* Skills */}
      <div className="mb-s-3">
        <label htmlFor="exp-skill-input" className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
          Skills and technologies
        </label>
        <div className="flex gap-s-2">
          <input
            id="exp-skill-input"
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKeyDown}
            placeholder="Type a skill and press Enter"
            className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddSkill}
            className="border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer text-meta"
          >
            Add
          </button>
        </div>
        {formData.skills.length > 0 && (
          <div className="mt-s-2">
            <p className="font-mono text-body text-ink-72">
              {formData.skills.map((skill, i) => (
                <span key={skill}>
                  <span className="underline cursor-pointer" onClick={() => handleRemoveSkill(skill)}>
                    {skill}
                  </span>
                  {i < formData.skills.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
            <p className="text-meta text-ink-35 mt-s-1">Click a skill to remove it.</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      <div className="mb-s-3">
        <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
          Key highlights and achievements
        </label>
        <p className="text-meta text-ink-50 mb-s-2">
          Add resume-ready bullet points. These will be available for resume building and job matching.
        </p>

        {/* Existing highlights */}
        {formData.highlights.length > 0 && (
          <ul className="space-y-s-1 mb-s-2">
            {formData.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-s-1 text-body text-ink-72 border-t border-rule pt-s-1">
                <span className="font-mono text-meta uppercase text-ink-50 shrink-0 mt-0.5">
                  {h.category}
                </span>
                <span className="flex-1">{h.text}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(i)}
                  className="text-ink-50 underline cursor-pointer text-meta shrink-0 min-h-[var(--target-min)] inline-flex items-center"
                  aria-label={`Remove highlight: ${h.text.slice(0, 30)}`}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add highlight form */}
        <div className="border-t border-rule pt-s-2 space-y-s-2">
          <div className="flex gap-s-2">
            <select
              value={highlightCategory}
              onChange={(e) => setHighlightCategory(e.target.value)}
              className="border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
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
              className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div className="flex gap-s-2">
            <input
              type="text"
              value={highlightMetrics}
              onChange={(e) => setHighlightMetrics(e.target.value)}
              placeholder="Metrics (e.g. increased revenue 40%)"
              className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
            <input
              type="text"
              value={highlightKeywords}
              onChange={(e) => setHighlightKeywords(e.target.value)}
              placeholder="Keywords (comma-separated)"
              className="flex-1 border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddHighlight}
              disabled={!highlightText.trim()}
              className="border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer text-meta disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-s-3 border border-rule p-s-2 text-body text-ink" role="alert">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-s-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update experience" : "Save experience"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
