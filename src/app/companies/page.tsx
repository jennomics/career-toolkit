"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  slug: string;
  notes: string | null;
  dreamCompany: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { jobs: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to load companies (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCompanies();
    }
  }, [fetchCompanies]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, searchQuery]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/companies/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Synced: ${data.created} created, ${data.linked} jobs linked`);
        fetchCompanies();
      } else {
        setSyncResult(data.error || "Sync failed");
      }
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewCompanyName("");
        fetchCompanies();
      } else {
        setError(data.error || "Failed to add company");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add company");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track companies, their jobs, and build targeted resumes
            </p>
          </div>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Home
            </Link>
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Jobs
            </Link>
            <Link href="/skills" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Skills
            </Link>
            <Link href="/resume" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Resume
            </Link>
            <Link href="/phrases" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Phrases
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Sync result */}
        {syncResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700 text-sm">
            {syncResult}
          </div>
        )}

        {/* Actions: Search + Add + Sync */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Add company form */}
          <form onSubmit={handleAddCompany} className="flex gap-3">
            <input
              type="text"
              placeholder="Add a new company..."
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!newCompanyName.trim() || adding}
              className="px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer"
            >
              {adding ? "Adding..." : "Add Company"}
            </button>
          </form>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border border-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {syncing ? "Syncing..." : "Sync Companies from Jobs"}
          </button>
        </div>

        {/* Companies grid */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading...</p>
        ) : filteredCompanies.length === 0 && companies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No companies yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Sync from existing jobs or add one manually.
            </p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No companies match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-purple-600">
                    {company.name}
                  </h3>
                  {company.dreamCompany && (
                    <span className="text-yellow-500 text-lg" title="Dream Company">
                      &#9733;
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {company._count.jobs} {company._count.jobs === 1 ? "job" : "jobs"}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Last updated {new Date(company.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
