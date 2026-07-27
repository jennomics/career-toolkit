"use client";

import { useState } from "react";

/**
 * Migration Page — one-click migrate from local SQLite to Neon.
 *
 * How it works:
 * 1. Fetches all data from your LOCAL /api/migrate/export
 * 2. POSTs it to PRODUCTION /api/migrate
 * 3. Shows results
 *
 * Open this on localhost:3000/migrate
 */
export default function MigratePage() {
  const [status, setStatus] = useState<string>("ready");
  const [log, setLog] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);

  const PRODUCTION_URL = "https://career-toolkit-gilt.vercel.app";

  async function runMigration() {
    setStatus("running");
    setLog([]);
    setResults(null);

    try {
      // Step 1: Export from local
      setLog((l) => [...l, "Exporting data from local database..."]);
      const exportRes = await fetch("/api/migrate/export");
      if (!exportRes.ok) {
        throw new Error(
          `Export failed: ${exportRes.status} ${await exportRes.text()}`
        );
      }
      const data = await exportRes.json();
      setLog((l) => [
        ...l,
        `  Found: ${data.counts.jobs} jobs, ${data.counts.skills} skills, ${data.counts.responsibilities} responsibilities, ${data.counts.corrections} corrections`,
      ]);

      // Step 2: Send to production
      setLog((l) => [...l, `Sending to ${PRODUCTION_URL}/api/migrate ...`]);
      const migrateRes = await fetch(`${PRODUCTION_URL}/api/migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: data.jobs,
          skills: data.skills,
          responsibilities: data.responsibilities,
          corrections: data.corrections,
        }),
      });

      if (!migrateRes.ok) {
        throw new Error(
          `Migration failed: ${migrateRes.status} ${await migrateRes.text()}`
        );
      }

      const result = await migrateRes.json();
      setResults(result);
      setLog((l) => [
        ...l,
        `Done! ${result.results.jobs.migrated} jobs migrated, ${result.totalJobsInDb} total in Neon.`,
      ]);
      setStatus("complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLog((l) => [...l, `ERROR: ${msg}`]);
      setStatus("error");
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">
        Migrate Local Data → Neon
      </h1>
      <p className="text-gray-600 mb-6">
        This will export all jobs from your local SQLite database and upload them
        to the production Neon PostgreSQL database. Safe to run multiple times
        (skips existing records).
      </p>

      <button
        onClick={runMigration}
        disabled={status === "running"}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        aria-label="Start migration from local SQLite to Neon PostgreSQL"
      >
        {status === "running"
          ? "Migrating..."
          : status === "complete"
            ? "Run Again"
            : "Start Migration"}
      </button>

      {log.length > 0 && (
        <pre className="mt-6 p-4 bg-gray-900 text-green-400 rounded-lg text-sm overflow-auto whitespace-pre-wrap">
          {log.join("\n")}
        </pre>
      )}

      {results && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h2 className="font-semibold mb-2">Results:</h2>
          <pre className="text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
