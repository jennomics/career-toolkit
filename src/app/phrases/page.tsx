"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";

/** Inline editable phrase component */
function EditablePhrase({
  phrase,
  onSave,
  onDelete,
}: {
  phrase: Phrase;
  onSave: (updated: { text: string }) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(phrase.text);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (!editText.trim() || editText === phrase.text) {
      setIsEditing(false);
      setEditText(phrase.text);
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/phrases/${phrase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim() }),
      });
      if (res.ok) {
        onSave({ text: editText.trim() });
        setIsEditing(false);
      }
    } catch {
      // Silent fail — phrase stays unchanged
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this phrase?")) return;
    try {
      const res = await fetch(`/api/phrases/${phrase.id}`, { method: "DELETE" });
      if (res.ok) onDelete();
    } catch {
      // Silent fail
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditText(phrase.text);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        <span className="mt-1.5 font-mono text-meta text-ink-50 uppercase tracking-widest shrink-0">
          {phrase.category === "responsibility" ? "DO" : phrase.category === "requirement" ? "NEED" : "NICE"}
        </span>
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full px-0 py-s-1 border-0 border-b border-rule bg-transparent text-body text-ink focus:outline-none focus:border-ink resize-none"
            autoFocus
            aria-label="Edit phrase text"
          />
          <div className="flex gap-s-2 mt-s-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-body text-ink underline font-medium cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditText(phrase.text); }}
              className="text-body text-ink-35 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <span className="mt-0.5 font-mono text-meta text-ink-50 uppercase tracking-widest shrink-0">
        {phrase.category === "responsibility" ? "DO" : phrase.category === "requirement" ? "NEED" : "NICE"}
      </span>
      <div className="flex-1">
        <p className="text-body text-ink">{phrase.text}</p>
        <div className="flex items-center gap-s-2 mt-0.5">
          <p className="font-mono text-meta text-ink-35">
            {phrase.jobTitle} at {phrase.company}
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="text-body text-ink underline opacity-0 group-hover:opacity-100 cursor-pointer"
            aria-label={`Edit phrase: ${phrase.text.slice(0, 30)}`}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-body text-ink-50 underline opacity-0 group-hover:opacity-100 cursor-pointer"
            aria-label={`Delete phrase: ${phrase.text.slice(0, 30)}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface Phrase {
  id: string;
  text: string;
  category: string;
  jobTitle: string;
  company: string;
  jobId: string;
}

interface KeywordGroup {
  keyword: string;
  jobCount: number;
  phraseCount: number;
  phrases: Phrase[];
}

interface PhrasesData {
  summary: {
    totalJobs: number;
    totalKeywords: number;
    totalPhrases: number;
  };
  keywords: KeywordGroup[];
}

export default function PhrasesPage() {
  const [data, setData] = useState<PhrasesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const hasFetched = useRef(false);

  async function fetchPhrases() {
    try {
      const res = await fetch("/api/phrases");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, `Failed (${res.status})`));
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function runBackfill() {
    setBackfillStatus("Running LLM tagging...");
    try {
      const res = await fetch("/api/phrases/backfill", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setBackfillStatus(`Error: ${result.error || "Failed"}`);
        return;
      }
      setBackfillStatus(
        `Done! Tagged ${result.tagged} phrases across ${result.processed} jobs. ${result.remainingUntagged > 0 ? `${result.remainingUntagged} remaining — click again.` : "All tagged!"}`
      );
      // Refresh data
      fetchPhrases();
    } catch (err) {
      setBackfillStatus(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    }
  }

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchPhrases();
    }
  }, []);

  // Filter keywords and phrases by search + category
  const filteredKeywords = useMemo(() => {
    if (!data) return [];

    let keywords = data.keywords;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      keywords = keywords
        .map((kw) => ({
          ...kw,
          phrases: kw.phrases.filter(
            (p) =>
              p.text.toLowerCase().includes(q) ||
              kw.keyword.toLowerCase().includes(q) ||
              p.jobTitle.toLowerCase().includes(q) ||
              p.company.toLowerCase().includes(q)
          ),
        }))
        .filter((kw) => kw.phrases.length > 0 || kw.keyword.toLowerCase().includes(q));
    }

    // Category filter
    if (categoryFilter !== "all") {
      keywords = keywords
        .map((kw) => ({
          ...kw,
          phrases: kw.phrases.filter((p) => p.category === categoryFilter),
        }))
        .filter((kw) => kw.phrases.length > 0);
    }

    return keywords;
  }, [data, searchQuery, categoryFilter]);

  const totalFilteredPhrases = filteredKeywords.reduce(
    (sum, kw) => sum + kw.phrases.length,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-35 text-body">Loading phrases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper p-s-4">
        <div className="max-w-[720px] mx-auto">
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Resume Phrases" subtitle="All extracted phrases grouped by keyword, sorted by frequency" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-4">
        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-3 gap-s-3 border-t border-rule pt-s-3">
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-h3 text-ink">
                {data.summary.totalPhrases}
              </p>
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Total phrases</p>
            </div>
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-h3 text-ink">
                {data.summary.totalKeywords}
              </p>
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Keywords</p>
            </div>
            <div className="border-t border-rule pt-s-2">
              <p className="font-mono text-h3 text-ink">
                {data.summary.totalJobs}
              </p>
              <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Jobs analyzed</p>
            </div>
          </div>
        )}

        {/* Backfill button */}
        {data && (
          <div className="border-t border-rule pt-s-3 flex items-center justify-between">
            <div>
              <p className="text-body font-medium text-ink">
                Tag phrases with keywords via AI
              </p>
              <p className="font-mono text-meta text-ink-35 mt-0.5">
                Uses GPT-4o-mini to associate each phrase with relevant skills
              </p>
            </div>
            <button
              onClick={runBackfill}
              disabled={backfillStatus?.startsWith("Running")}
              className="px-s-3 h-[48px] border-[1.5px] border-live text-live text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Run AI tagging on phrases"
            >
              {backfillStatus?.startsWith("Running") ? "Tagging..." : "Tag with AI"}
            </button>
          </div>
        )}

        {backfillStatus && !backfillStatus.startsWith("Running") && (
          <div className="border border-rule p-s-2 text-body text-ink">
            {backfillStatus}
          </div>
        )}

        {/* Search and filters */}
        <div className="space-y-s-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phrases, keywords, companies..."
            className="w-full px-0 py-s-2 border-0 border-b border-rule bg-transparent text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink"
            aria-label="Search phrases"
          />

          <div className="flex items-center gap-s-3">
            <div className="flex gap-s-2" role="group" aria-label="Filter by category">
              {[
                { value: "all", label: "ALL" },
                { value: "responsibility", label: "DO" },
                { value: "requirement", label: "NEED" },
                { value: "qualification", label: "NICE" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-s-2 min-h-[44px] font-mono text-meta uppercase tracking-widest cursor-pointer ${
                    categoryFilter === cat.value
                      ? "border-b-2 border-ink text-ink"
                      : "text-ink-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {(searchQuery || categoryFilter !== "all") && (
              <span className="font-mono text-meta text-ink-35 ml-auto">
                {totalFilteredPhrases} phrases in {filteredKeywords.length} keywords
              </span>
            )}
          </div>
        </div>

        {/* Keywords list */}
        {filteredKeywords.length === 0 ? (
          <div className="text-center py-s-5">
            <p className="text-ink-50 text-h3 font-zen">No phrases found</p>
            {data && data.summary.totalJobs === 0 ? (
              <p className="text-ink-35 text-body mt-s-1">
                Add some job descriptions first. Phrases will be extracted automatically.
              </p>
            ) : (
              <p className="text-ink-35 text-body mt-s-1">
                Try a different search or category filter.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-rule border-t border-rule">
            {filteredKeywords.map((kw) => (
              <div key={kw.keyword}>
                {/* Keyword header */}
                <button
                  onClick={() =>
                    setExpandedKeyword(
                      expandedKeyword === kw.keyword ? null : kw.keyword
                    )
                  }
                  className="w-full py-s-2 flex items-center justify-between cursor-pointer min-h-[44px]"
                  aria-expanded={expandedKeyword === kw.keyword}
                  aria-label={`${kw.keyword}: ${kw.phraseCount} phrases from ${kw.jobCount} jobs`}
                >
                  <div className="flex items-center gap-s-2">
                    <span className="text-body font-medium text-ink">
                      {kw.keyword}
                    </span>
                    <span className="font-mono text-meta text-ink-35">
                      {kw.jobCount} job{kw.jobCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-s-2">
                    <span className="font-mono text-meta text-ink-50">
                      {kw.phrases.length} phrase{kw.phrases.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-ink-35 text-body">
                      {expandedKeyword === kw.keyword ? "v" : ">"}
                    </span>
                  </div>
                </button>

                {/* Expanded phrases */}
                {expandedKeyword === kw.keyword && kw.phrases.length > 0 && (
                  <div className="border-t border-rule pl-s-3 py-s-2 space-y-s-2">
                    {kw.phrases.map((phrase, i) => (
                      <EditablePhrase
                        key={`${phrase.id || phrase.jobId}-${i}`}
                        phrase={phrase}
                        onSave={(updated) => {
                          setData((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              keywords: prev.keywords.map((k) => ({
                                ...k,
                                phrases: k.phrases.map((p) =>
                                  p.id === phrase.id ? { ...p, ...updated } : p
                                ),
                              })),
                            };
                          });
                        }}
                        onDelete={() => {
                          setData((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              keywords: prev.keywords.map((k) => ({
                                ...k,
                                phrases: k.phrases.filter((p) => p.id !== phrase.id),
                                phraseCount: k.phrases.filter((p) => p.id !== phrase.id).length,
                              })),
                              summary: {
                                ...prev.summary,
                                totalPhrases: prev.summary.totalPhrases - 1,
                              },
                            };
                          });
                        }}
                      />
                    ))}
                  </div>
                )}

                {expandedKeyword === kw.keyword && kw.phrases.length === 0 && (
                  <div className="border-t border-rule pl-s-3 py-s-2">
                    <p className="text-body text-ink-35">
                      No phrases directly associated with this keyword yet.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
