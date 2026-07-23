"use client";

import { useState } from "react";

interface AddJobFormProps {
  onJobAdded: () => void;
}

export default function AddJobForm({ onJobAdded }: AddJobFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    url: "",
    description: "",
    source: "linkedin",
    notes: "",
  });

  const handleDescriptionBlur = async () => {
    if (formData.description.length < 50) return;

    const res = await fetch("/api/parse-skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: formData.description }),
    });

    if (res.ok) {
      const { skills } = await res.json();
      setParsedSkills(skills);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        skills: parsedSkills,
      }),
    });

    if (res.ok) {
      setFormData({
        title: "",
        company: "",
        location: "",
        url: "",
        description: "",
        source: "linkedin",
        notes: "",
      });
      setParsedSkills([]);
      setIsOpen(false);
      onJobAdded();
    }

    setIsSubmitting(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
      >
        + Add a Job Description
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold mb-4">Add Job Description</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Senior Product Manager"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company *
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="e.g. Acme Corp"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Remote, San Francisco, CA"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="linkedin">LinkedIn</option>
            <option value="company-site">Company Website</option>
            <option value="referral">Referral</option>
            <option value="indeed">Indeed</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Posting URL
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Job Description * <span className="text-gray-400 font-normal">(paste the full description)</span>
        </label>
        <textarea
          required
          rows={8}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          onBlur={handleDescriptionBlur}
          placeholder="Paste the job description here. Skills will be auto-detected when you click away."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      {parsedSkills.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detected Skills
          </label>
          <div className="flex flex-wrap gap-2">
            {parsedSkills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          rows={2}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any personal notes about this role..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Saving..." : "Save Job"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setParsedSkills([]);
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
