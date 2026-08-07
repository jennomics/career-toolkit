"use client";

import { useState, useEffect, useCallback } from "react";

interface MappedQuestion {
  question: string;
  rationale: string;
  claimIds: string[];
  gap: boolean;
}

interface DecompositionData {
  id: string;
  jobId: string;
  problemStatement: string;
  responsibilities: string[];
  statedBars: string[];
  vocabulary: string[];
  hiringQuestions: MappedQuestion[];
  partialExtraction: boolean;
  claimStatements: Record<string, string>;
}

interface DecompositionPanelProps {
  jobId: string;
}

export default function DecompositionPanel({ jobId }: DecompositionPanelProps) {
  const [data, setData] = useState<DecompositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set()
  );

  const loadDecomposition = useCallback(async () => {
    try {
      const res = await fetch(`/api/decomposition/${jobId}`);
      if (res.status === 404) {
        setData(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load decomposition");
      }
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await loadDecomposition();
      if (cancelled) return;
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadDecomposition]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/decomposition/${jobId}`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to regenerate decomposition");
      }
      setLoading(true);
      await loadDecomposition();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleQuestion(index);
    }
  };

  if (loading) {
    return (
      <div className="mt-s-3 pt-s-2 border-t border-rule" role="region" aria-label="Posting decomposition">
        <p className="font-mono text-meta text-ink-50">Loading decomposition...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-s-3 pt-s-2 border-t border-rule" role="region" aria-label="Posting decomposition">
        <p className="text-body text-ink">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-s-3 pt-s-2 border-t border-rule" role="region" aria-label="Posting decomposition">
        <p className="font-mono text-meta text-ink-50">
          Decomposition pending...
        </p>
      </div>
    );
  }

  const questions = data.hiringQuestions || [];
  const gapCount = questions.filter((q) => q.gap).length;
  const claimStatements = data.claimStatements || {};

  return (
    <div className="mt-s-3 pt-s-2 border-t border-rule" role="region" aria-label="Posting decomposition">
      {/* Problem Statement */}
      <div className="mb-s-2">
        <h4 className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
          Strategic problem
        </h4>
        <p className="text-body text-ink">
          {data.problemStatement}
        </p>
      </div>

      {/* Partial extraction warning with regenerate */}
      {data.partialExtraction && questions.length === 0 && (
        <div className="mb-s-2 border border-rule p-s-2 flex items-center justify-between">
          <span className="text-body text-ink">
            Partial extraction - LLM unavailable. Click to regenerate.
          </span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Regenerate decomposition"
            className="border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}

      {/* Empty questions without partial extraction */}
      {!data.partialExtraction && questions.length === 0 && (
        <div className="mb-s-2 border border-rule p-s-2 flex items-center justify-between">
          <span className="text-body text-ink-72">
            No hiring questions extracted.
          </span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Regenerate decomposition"
            className="border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}

      {/* Hiring Questions */}
      {questions.length > 0 && (
        <div className="mb-s-2">
          <h4 className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 flex items-center gap-s-1">
            Hiring questions
            {gapCount > 0 && (
              <span className="font-mono text-meta text-live">
                {gapCount} {gapCount === 1 ? "gap" : "gaps"}
              </span>
            )}
          </h4>
          <ul className="space-y-s-1">
            {questions.map((q, idx) => {
              const isExpanded = expandedQuestions.has(idx);
              return (
                <li key={idx} className="border-t border-rule">
                  <button
                    onClick={() => toggleQuestion(idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    aria-expanded={isExpanded}
                    aria-label={`${q.question}${q.gap ? " - no supporting evidence" : ` - ${q.claimIds.length} claims`}`}
                    className="w-full flex items-center gap-s-1 py-s-1 text-left cursor-pointer"
                  >
                    {/* Expand/collapse indicator */}
                    <svg
                      className={`h-3 w-3 text-ink-50 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>

                    {/* Question text */}
                    <span className="flex-1 text-body text-ink-72">
                      {q.question}
                    </span>

                    {/* Gap indicator or claim count */}
                    {q.gap ? (
                      <span className="font-mono text-meta text-live shrink-0">
                        gap
                      </span>
                    ) : (
                      <span className="font-mono text-meta text-ink-50 shrink-0">
                        {q.claimIds.length} {q.claimIds.length === 1 ? "claim" : "claims"}
                      </span>
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="pl-s-3 pb-s-2">
                      {q.rationale && (
                        <p className="text-meta text-ink-50 mb-s-1">
                          {q.rationale}
                        </p>
                      )}
                      {q.claimIds.length > 0 ? (
                        <ul className="space-y-s-1">
                          {q.claimIds.map((claimId) => (
                            <li
                              key={claimId}
                              className="text-body text-ink-72 border-t border-rule pt-s-1"
                            >
                              {claimStatements[claimId] || claimId}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-body text-ink-72">
                          No claims mapped to this question. Consider adding
                          supporting evidence.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Vocabulary Tags */}
      {data.vocabulary.length > 0 && (
        <div>
          <h4 className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1">
            Distinctive vocabulary
          </h4>
          <p className="font-mono text-body text-ink-72">
            {data.vocabulary.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
