"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";

interface Phrase {
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
  const hasFetched = useRef(false);

  async function fetchPhrases() {
    try {
      const res = await fetch("/api/phrases");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading phrases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resume Phrases
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              All extracted phrases grouped by keyword, sorted by frequency
            </p>
          </div>
          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              &larr; Back to Jobs
            </Link>
            <Link
              href="/profile"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary stats */}
        {data && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalPhrases}
              </p>
              <p className="text-sm text-gray-500">Total Phrases</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalKeywords}
              </p>
              <p className="text-sm text-gray-500">Keywords</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.totalJobs}
              </p>
              <p className="text-sm text-gray-500">Jobs Analyzed</p>
            </div>
          </div>
        )}

        {/* Search and filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phrases, keywords, companies..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search phrases"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2" role="group" aria-label="Filter by category">
              {[
                { value: "all", label: "All" },
                { value: "responsibility", label: "DO", color: "bg-green-100 text-green-700" },
                { value: "requirement", label: "NEED", color: "bg-purple-100 text-purple-700" },
                { value: "qualification", label: "NICE", color: "bg-gray-100 text-gray-600" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    categoryFilter === cat.value
                      ? "bg-gray-900 text-white"
                      : cat.color || "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {(searchQuery || categoryFilter !== "all") && (
              <span className="text-xs text-gray-400 ml-auto">
                {totalFilteredPhrases} phrases in {filteredKeywords.length} keywords
              </span>
            )}
          </div>
        </div>

        {/* Keywords list */}
        {filteredKeywords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No phrases found</p>
            {data && data.summary.totalJobs === 0 ? (
              <p className="text-gray-400 text-sm mt-1">
                Add some job descriptions first — phrases will be extracted automatically.
              </p>
            ) : (
              <p className="text-gray-400 text-sm mt-1">
                Try a different search or category filter.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKeywords.map((kw) => (
              <div
                key={kw.keyword}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {/* Keyword header */}
                <button
                  onClick={() =>
                    setExpandedKeyword(
                      expandedKeyword === kw.keyword ? null : kw.keyword
                    )
                  }
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                  aria-expanded={expandedKeyword === kw.keyword}
                  aria-label={`${kw.keyword}: ${kw.phraseCount} phrases from ${kw.jobCount} jobs`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {kw.keyword}
                    </span>
                    <span className="text-xs text-gray-400">
                      {kw.jobCount} job{kw.jobCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {kw.phrases.length} phrase{kw.phrases.length !== 1 ? "s" : ""}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedKeyword === kw.keyword ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded phrases */}
                {expandedKeyword === kw.keyword && kw.phrases.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {kw.phrases.map((phrase, i) => (
                      <div
                        key={`${phrase.jobId}-${i}`}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span
                          className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0 ${
                            phrase.category === "responsibility"
                              ? "bg-green-100 text-green-700"
                              : phrase.category === "requirement"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {phrase.category === "responsibility"
                            ? "DO"
                            : phrase.category === "requirement"
                            ? "NEED"
                            : "NICE"}
                        </span>
                        <div className="flex-1">
                          <p className="text-gray-800">{phrase.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {phrase.jobTitle} at {phrase.company}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {expandedKeyword === kw.keyword && kw.phrases.length === 0 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-sm text-gray-400">
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
