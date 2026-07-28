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
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: { id: string; title: string; company: string; reason: string; createdAt: string }[];
  } | null>(null);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [parsedResponsibilities, setParsedResponsibilities] = useState<
    { text: string; category: string; keywords: string[] }[]
  >([]);
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
    setDuplicateWarning(null);

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
      setParsedResponsibilities(parsed.responsibilities || []);

      // Check for duplicates (non-blocking — wrapped in try/catch)
      try {
        const dupRes = await fetch("/api/jobs/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: parsed.title || "",
            company: parsed.company || "",
            description: rawText,
          }),
        });
        if (dupRes.ok) {
          const dupData = await dupRes.json();
          if (dupData.isDuplicate) {
            setDuplicateWarning({ matches: dupData.matches });
          }
        }
      } catch {
        // Duplicate check failure is non-critical — proceed silently
      }

      setStep("review");
    }

    setIsParsing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          skills: parsedSkills,
          responsibilities: parsedResponsibilities.map((r) => ({
            text: r.text,
            category: r.category,
            keywords: r.keywords || [],
          })),
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
        setParsedResponsibilities([]);
        setExtractedValues(null);
        setDuplicateWarning(null);
        setStep("paste");
        setIsOpen(false);
        onJobAdded();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Save failed (${res.status})`);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    }

    setIsSubmitting(false);
  };

  const handleReset = () => {
    setStep("paste");
    setRawText("");
    setParsedSkills([]);
    setParsedResponsibilities([]);
    setExtractedValues(null);
    setDuplicateWarning(null);
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

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Possible duplicate detected
              </p>
              <ul className="mt-1 text-sm text-amber-700">
                {duplicateWarning.matches.map((m) => (
                  <li key={m.id}>
                    <strong>{m.title}</strong> at {m.company} — {m.reason}
                    <span className="text-amber-500 ml-1">
                      (saved {new Date(m.createdAt).toLocaleDateString()})
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-600">
                You can still save this job if it&apos;s a different posting.
              </p>
            </div>
          </div>
        </div>
      )}

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
            Detected Keywords
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

      {parsedResponsibilities.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume-Ready Phrases
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Action-driven statements extracted from the description. Use these as starting points for resume bullets.
          </p>
          <ul className="space-y-2">
            {parsedResponsibilities.map((r, i) => (
              <li key={i} className="text-sm text-gray-800">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                    r.category === "responsibility"
                      ? "bg-green-100 text-green-700"
                      : r.category === "requirement"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {r.category === "responsibility" ? "DO" : r.category === "requirement" ? "NEED" : "NICE"}
                  </span>
                  <span>{r.text}</span>
                </div>
                {r.keywords && r.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-8 mt-1">
                    {r.keywords.map((kw) => (
                      <span key={kw} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

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
