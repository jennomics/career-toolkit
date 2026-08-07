"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";

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
        setError(extractErrorMessage(errData, `Failed to load companies (${res.status})`));
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
        setSyncResult(extractErrorMessage(data, "Sync failed"));
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
        setError(extractErrorMessage(data, "Failed to add company"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add company");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Companies" subtitle="Track companies, their jobs, and build targeted resumes" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-4">
        {/* Error display */}
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
          </div>
        )}

        {/* Sync result */}
        {syncResult && (
          <div className="border border-rule p-s-3 text-ink text-body">
            {syncResult}
          </div>
        )}

        {/* Actions: Search + Add + Sync */}
        <div className="space-y-s-3 border-t border-rule pt-s-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-0 py-s-2 border-0 border-b border-rule bg-transparent text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink"
          />

          {/* Add company form */}
          <form onSubmit={handleAddCompany} className="flex gap-s-2">
            <input
              type="text"
              placeholder="Add a new company..."
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="flex-1 px-0 py-s-2 border-0 border-b border-rule bg-transparent text-body text-ink placeholder:text-ink-35 focus:outline-none focus:border-ink"
            />
            <button
              type="submit"
              disabled={!newCompanyName.trim() || adding}
              className="px-s-3 h-[48px] border-[1.5px] border-live text-live text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {adding ? "Adding..." : "Add company"}
            </button>
          </form>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-s-3 h-[48px] border border-ink text-ink text-body font-medium disabled:opacity-50 cursor-pointer"
          >
            {syncing ? "Syncing..." : "Sync companies from jobs"}
          </button>
        </div>

        {/* Companies list */}
        {loading ? (
          <p className="text-center text-ink-35 py-s-5">Loading...</p>
        ) : filteredCompanies.length === 0 && companies.length === 0 ? (
          <div className="text-center py-s-5">
            <p className="text-ink-50 text-h3 font-zen">No companies yet</p>
            <p className="text-ink-35 text-body mt-s-1">
              Sync from existing jobs or add one manually.
            </p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-s-4">
            <p className="text-ink-35 text-body">No companies match your search</p>
          </div>
        ) : (
          <div className="divide-y divide-rule border-t border-rule">
            {filteredCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                className="block py-s-3 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-body font-medium text-ink">
                    {company.name}
                  </h3>
                  {company.dreamCompany && (
                    <span className="text-ink-50" title="Dream Company">
                      &#9733;
                    </span>
                  )}
                </div>
                <p className="font-mono text-meta text-ink-50 mt-1">
                  {company._count.jobs} {company._count.jobs === 1 ? "job" : "jobs"}
                </p>
                <p className="font-mono text-meta text-ink-35 mt-1">
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
