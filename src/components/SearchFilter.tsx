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
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
      {/* Search input */}
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
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search jobs by title, company, skills, or description..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search jobs"
        />
        {searchValue && (
          <button
            onClick={() => setSearchValue("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Company filter */}
        {companies.length > 0 && (
          <select
            value={selectedCompany}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        )}

        {/* Result count */}
        {hasActiveFilters && (
          <span className="text-xs text-gray-400 ml-auto">
            {resultCount} of {totalCount} jobs
          </span>
        )}
      </div>
    </div>
  );
}
