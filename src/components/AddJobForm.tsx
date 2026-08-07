"use client";

import { useState } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

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

      // Check for duplicates (non-blocking)
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
        // Duplicate check failure is non-critical
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
        setError(extractErrorMessage(data, `Save failed (${res.status})`));
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
        className="w-full border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center justify-center cursor-pointer transition-colors"
      >
        Add a job description
      </button>
    );
  }

  // Step 1: Paste
  if (step === "paste") {
    return (
      <div className="border-t border-rule pt-s-3">
        <h2 className="text-h3 font-medium text-ink mb-s-1">
          Paste a job description
        </h2>
        <p className="text-body text-ink-72 mb-s-3">
          Copy the entire job posting from LinkedIn (or anywhere) and paste it
          below. Title, company, location, and skills will be extracted
          automatically.
        </p>
        <textarea
          rows={12}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the full job posting here..."
          className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none font-mono"
        />
        <div className="flex gap-s-3 mt-s-3">
          <button
            onClick={handlePaste}
            disabled={rawText.length < 20 || isParsing}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            {isParsing ? "Extracting..." : "Extract details"}
          </button>
          <button
            onClick={handleReset}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
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
      className="border-t border-rule pt-s-3"
    >
      <h2 className="text-h3 font-medium text-ink mb-s-1">Review extracted details</h2>
      <p className="text-body text-ink-72 mb-s-3">
        These were pulled from the description. Fix anything that looks wrong.
      </p>

      {/* Duplicate warning */}
      {duplicateWarning && (
        <div className="mb-s-3 border border-rule p-s-2 text-body text-ink" role="alert">
          <p className="font-medium mb-s-1">
            Possible duplicate detected
          </p>
          <ul className="text-body text-ink-72">
            {duplicateWarning.matches.map((m) => (
              <li key={m.id}>
                {m.title} at {m.company} - {m.reason}
                <span className="text-ink-50 ml-s-1">
                  (saved {new Date(m.createdAt).toLocaleDateString()})
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-s-1 text-meta font-mono text-ink-50">
            You can still save this job if it is a different posting.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-s-3 mb-s-3">
        <div>
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Job title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Company
          </label>
          <input
            type="text"
            required
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Source
          </label>
          <select
            value={formData.source}
            onChange={(e) =>
              setFormData({ ...formData, source: e.target.value })
            }
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
          >
            <option value="linkedin">LinkedIn</option>
            <option value="company-site">Company Website</option>
            <option value="referral">Referral</option>
            <option value="indeed">Indeed</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Job posting URL
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) =>
              setFormData({ ...formData, url: e.target.value })
            }
            placeholder="https://..."
            className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {parsedSkills.length > 0 && (
        <div className="mb-s-3">
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Detected keywords
          </label>
          <p className="font-mono text-body text-ink-72">
            {parsedSkills.join(", ")}
          </p>
        </div>
      )}

      {parsedResponsibilities.length > 0 && (
        <div className="mb-s-3">
          <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Resume-ready phrases
          </label>
          <p className="text-meta text-ink-50 mb-s-1">
            Action-driven statements extracted from the description.
          </p>
          <ul className="space-y-s-1">
            {parsedResponsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-s-1 text-body text-ink-72">
                <span className="font-mono text-meta uppercase text-ink-50 shrink-0 mt-0.5">
                  {r.category === "responsibility" ? "DO" : r.category === "requirement" ? "NEED" : "NICE"}
                </span>
                <div>
                  <span>{r.text}</span>
                  {r.keywords && r.keywords.length > 0 && (
                    <span className="font-mono text-ink-50 ml-s-1">
                      [{r.keywords.join(", ")}]
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-s-3">
        <label className="block text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
          Notes
        </label>
        <textarea
          rows={2}
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          placeholder="Why does this role interest you? Anyone you know there?"
          className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-s-3 border border-rule p-s-2 text-body text-ink" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-s-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save job"}
        </button>
        <button
          type="button"
          onClick={() => setStep("paste")}
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
