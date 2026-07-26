"use client";

import { useState } from "react";

interface AddJobFormProps {
  onJobAdded: () => void;
}

export default function AddJobForm({ onJobAdded }: AddJobFormProps) {
  const [step, setStep] = useState<"paste" | "review">("paste");
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [extractedValues, setExtractedValues] = useState<{
    title: string;
    company: string;
    location: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    url: "",
    description: "",
    source: "linkedin",
    notes: "",
  });

  const handlePaste = async () => {
    if (rawText.length < 20) return;
    setIsParsing(true);

    const res = await fetch("/api/parse-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText }),
    });

    if (res.ok) {
      const parsed = await res.json();
      setFormData({
        ...formData,
        title: parsed.title || "",
        company: parsed.company || "",
        location: parsed.location || "",
        description: rawText,
      });
      setExtractedValues({
        title: parsed.title || "",
        company: parsed.company || "",
        location: parsed.location || "",
      });
      setParsedSkills(parsed.skills || []);
      setStep("review");
    }

    setIsParsing(false);
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
        extracted: extractedValues,
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
      setRawText("");
      setParsedSkills([]);
      setExtractedValues(null);
      setStep("paste");
      setIsOpen(false);
      onJobAdded();
    }

    setIsSubmitting(false);
  };

  const handleReset = () => {
    setStep("paste");
    setRawText("");
    setParsedSkills([]);
    setExtractedValues(null);
    setFormData({
      title: "",
      company: "",
      location: "",
      url: "",
      description: "",
      source: "linkedin",
      notes: "",
    });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-4 border-2 border-dashed border-gray-300
          rounded-lg text-gray-500 hover:border-blue-400
          hover:text-blue-500 transition-colors cursor-pointer"
      >
        + Add a Job Description
      </button>
    );
  }

  // Step 1: Paste
  if (step === "paste") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">
          Paste a Job Description
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Copy the entire job posting from LinkedIn (or anywhere) and paste it
          below. I&apos;ll extract the title, company, location, and skills
          automatically.
        </p>
        <textarea
          rows={12}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Paste the full job posting here...\n\nExample:\nSenior Product Manager\nAcme Corp · San Francisco, CA · 2 days ago\n\nAbout the role:\nWe're looking for a Senior Product Manager to lead...\n\nRequirements:\n- 5+ years of product management experience\n- Experience with agile methodologies...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500
            font-mono text-sm text-gray-900"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePaste}
            disabled={rawText.length < 20 || isParsing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md
              hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {isParsing ? "Extracting..." : "Extract Details"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800
              cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Review extracted data
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold mb-1">Review Extracted Details</h2>
      <p className="text-sm text-gray-500 mb-4">
        I pulled these from the description. Fix anything that looks wrong.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Source
          </label>
          <select
            value={formData.source}
            onChange={(e) =>
              setFormData({ ...formData, source: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            onChange={(e) =>
              setFormData({ ...formData, url: e.target.value })
            }
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
                className="px-2 py-1 bg-blue-100 text-blue-700
                  rounded-full text-xs font-medium"
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
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          placeholder="Why does this role interest you? Anyone you know there?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md
            hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Saving..." : "Save Job"}
        </button>
        <button
          type="button"
          onClick={() => setStep("paste")}
          className="px-4 py-2 text-gray-600 hover:text-gray-800
            cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:text-gray-800
            cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
