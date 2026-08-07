"use client";

import { useState, useEffect, useRef } from "react";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  companies: string[];
  sources: string[];
  selectedCompany: string;
  selectedSource: string;
  onCompanyChange: (company: string) => void;
  onSourceChange: (source: string) => void;
  resultCount: number;
  totalCount: number;
}

export default function SearchFilter({
  onSearch,
  companies,
  sources,
  selectedCompany,
  selectedSource,
  onCompanyChange,
  onSourceChange,
  resultCount,
  totalCount,
}: SearchFilterProps) {
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSearch(searchValue);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, onSearch]);

  const hasActiveFilters =
    searchValue || selectedCompany || selectedSource;

  return (
    <div className="space-y-s-2">
      {/* Search input */}
      <div className="relative">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search jobs by title, company, skills, or description..."
          className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
          aria-label="Search jobs"
        />
        {searchValue && (
          <button
            onClick={() => setSearchValue("")}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-ink-35 min-h-[var(--target-min)] inline-flex items-center cursor-pointer px-s-1"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-s-3 items-center">
        {/* Company filter */}
        {companies.length > 0 && (
          <select
            value={selectedCompany}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink font-mono focus:border-b-2 focus:border-ink focus:outline-none"
            aria-label="Filter by company"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {/* Source filter */}
        {sources.length > 0 && (
          <select
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink font-mono focus:border-b-2 focus:border-ink focus:outline-none"
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchValue("");
              onCompanyChange("");
              onSourceChange("");
            }}
            className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer text-meta"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        )}

        {/* Result count */}
        {hasActiveFilters && (
          <span className="font-mono text-meta text-ink-50 ml-auto">
            {resultCount} of {totalCount} jobs
          </span>
        )}
      </div>
    </div>
  );
}
