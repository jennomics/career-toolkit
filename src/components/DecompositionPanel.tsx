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
      // Reload the data after regeneration
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
      <div className="mt-4 p-3 bg-gray-50 rounded-lg" role="region" aria-label="Posting decomposition">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading decomposition...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-3 bg-red-50 rounded-lg" role="region" aria-label="Posting decomposition">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg" role="region" aria-label="Posting decomposition">
        <p className="text-sm text-gray-500 italic">
          Decomposition pending...
        </p>
      </div>
    );
  }

  const questions = data.hiringQuestions || [];
  const gapCount = questions.filter((q) => q.gap).length;
  const claimStatements = data.claimStatements || {};

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200" role="region" aria-label="Posting decomposition">
      {/* Problem Statement */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Strategic Problem
        </h4>
        <p className="text-sm font-medium text-slate-800">
          {data.problemStatement}
        </p>
      </div>

      {/* Partial extraction warning with regenerate */}
      {data.partialExtraction && questions.length === 0 && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-amber-600 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-amber-700">
              Partial extraction - LLM unavailable. Click to regenerate.
            </span>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Regenerate decomposition"
            className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}

      {/* Empty questions without partial extraction - show regenerate option */}
      {!data.partialExtraction && questions.length === 0 && (
        <div className="mb-3 p-3 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-between">
          <span className="text-sm text-slate-600">
            No hiring questions extracted.
          </span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            aria-label="Regenerate decomposition"
            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}

      {/* Hiring Questions */}
      {questions.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            Hiring Questions
            {gapCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                {gapCount} {gapCount === 1 ? "gap" : "gaps"}
              </span>
            )}
          </h4>
          <ul className="space-y-1.5">
            {questions.map((q, idx) => {
              const isExpanded = expandedQuestions.has(idx);
              return (
                <li key={idx} className="rounded border border-slate-200 bg-white">
                  <button
                    onClick={() => toggleQuestion(idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    aria-expanded={isExpanded}
                    aria-label={`${q.question}${q.gap ? " - no supporting evidence" : ` - ${q.claimIds.length} claims`}`}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-slate-50 transition-colors rounded"
                  >
                    {/* Expand/collapse indicator */}
                    <svg
                      className={`h-3 w-3 text-slate-400 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
                    <span className="flex-1 text-sm text-slate-700">
                      {q.question}
                    </span>

                    {/* Gap indicator or claim count */}
                    {q.gap ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        No supporting evidence
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-50 text-green-700 border border-green-200 shrink-0">
                        {q.claimIds.length} {q.claimIds.length === 1 ? "claim" : "claims"}
                      </span>
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-2 pt-1 border-t border-slate-100">
                      {q.rationale && (
                        <p className="text-xs text-slate-500 italic mb-1.5">
                          {q.rationale}
                        </p>
                      )}
                      {q.claimIds.length > 0 ? (
                        <ul className="space-y-1">
                          {q.claimIds.map((claimId) => (
                            <li
                              key={claimId}
                              className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1"
                            >
                              {claimStatements[claimId] || claimId}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-amber-600">
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
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Distinctive Vocabulary
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {data.vocabulary.map((term, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
