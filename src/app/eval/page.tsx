"use client";

import { useEffect, useState } from "react";
import Nav from "@/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EvalRunSummary {
  id: string;
  goldenPackageId: string | null;
  modelId: string;
  promptVersion: string;
  factScore: number | null;
  voiceScore: number | null;
  editDistance: number | null;
  anchorDiscrimination: number | null;
  createdAt: string;
}

interface EvalMetrics {
  editDistance: number;
  regressionPassRate: number;
  propertyViolationsPerThousandWords: number;
  anchorDiscrimination: number;
  variance: number;
  factScore: number;
  voiceScore: number;
  overallPass: boolean;
}

interface EvalResultsResponse {
  runs: EvalRunSummary[];
  metrics: EvalMetrics;
  trend: "improving" | "declining" | "stable";
  count: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EvalDashboardPage() {
  const [data, setData] = useState<EvalResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch("/api/eval/results?limit=10");
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load eval results");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav title="Eval Dashboard" />
        <main className="max-w-[720px] mx-auto px-6 py-8">
          <p className="text-ink-50">Loading evaluation results...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav title="Eval Dashboard" />
        <main className="max-w-[720px] mx-auto px-6 py-8">
          <p className="text-ink-72">Error: {error}</p>
        </main>
      </div>
    );
  }

  if (!data || data.runs.length === 0) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav title="Eval Dashboard" />
        <main className="max-w-[720px] mx-auto px-6 py-8">
          <p className="text-ink-50">No evaluation runs yet.</p>
        </main>
      </div>
    );
  }

  const { metrics, runs, trend } = data;

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Eval Dashboard" subtitle="Monitor evaluation metrics and run history" />
      <main className="max-w-[720px] mx-auto px-6 py-8">

      {/* Primary Metric: Edit Distance */}
      <div className="mb-8 p-6 border">
        <h2 className="text-sm font-medium text-ink-50 uppercase tracking-wide mb-1">
          Primary Metric: Edit Distance
        </h2>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold">
            {(metrics.editDistance * 100).toFixed(1)}%
          </span>
          <TrendIndicator trend={trend} />
        </div>
        <p className="text-sm text-ink-50 mt-1">
          Normalized character-level Levenshtein distance (lower is better)
        </p>
      </div>

      {/* Separate Fact and Voice Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Fact Score Section */}
        <div className="p-6 border">
          <h2 className="text-sm font-medium text-ink-50 uppercase tracking-wide mb-2">
            Fact Score
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {(metrics.factScore * 100).toFixed(0)}%
            </span>
            {metrics.regressionPassRate < 1.0 && (
              <span className="text-ink-72 text-sm font-medium">
                REGRESSION
              </span>
            )}
          </div>
          <p className="text-sm text-ink-50 mt-1">
            Assertion pass rate: {(metrics.regressionPassRate * 100).toFixed(0)}%
          </p>
          {metrics.regressionPassRate < 1.0 && (
            <div className="mt-2 p-2 border border-rule rounded text-ink-72 text-sm">
              Fact assertions failing - generation blocked regardless of voice score
            </div>
          )}
        </div>

        {/* Voice Score Section */}
        <div className="p-6 border">
          <h2 className="text-sm font-medium text-ink-50 uppercase tracking-wide mb-2">
            Voice / Structure Score
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {(metrics.voiceScore * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-ink-50 mt-1">
            Violations per 1000 words: {metrics.propertyViolationsPerThousandWords.toFixed(1)}
          </p>
          <p className="text-sm text-ink-50">
            Anchor discrimination: {metrics.anchorDiscrimination.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`mb-8 p-4 border border-rule`}>
        <span className={`font-medium ${metrics.overallPass ? "text-ink" : "text-ink"}`}>
          Overall: {metrics.overallPass ? "PASS" : "FAIL"}
        </span>
        {!metrics.overallPass && (
          <span className="text-sm text-ink-50 ml-2">
            {metrics.regressionPassRate < 1.0
              ? "Fact assertions failing"
              : "Voice score below threshold"}
          </span>
        )}
      </div>

      {/* Last 10 Runs Table */}
      <div className="border overflow-hidden">
        <h2 className="text-sm font-medium text-ink-50 uppercase tracking-wide p-4 border-b">
          Recent Runs ({runs.length})
        </h2>
        <table className="w-full text-sm">
          <thead className="bg-paper">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Model</th>
              <th className="px-4 py-2 text-right">Fact</th>
              <th className="px-4 py-2 text-right">Voice</th>
              <th className="px-4 py-2 text-right">Edit Dist</th>
              <th className="px-4 py-2 text-center">Trend</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, idx) => {
              const prevRun = runs[idx + 1];
              const runTrend = getRunTrend(run, prevRun);
              return (
                <tr key={run.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{run.modelId}</td>
                  <td className="px-4 py-2 text-right">
                    {run.factScore !== null
                      ? `${(run.factScore * 100).toFixed(0)}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {run.voiceScore !== null
                      ? `${(run.voiceScore * 100).toFixed(0)}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {run.editDistance !== null
                      ? `${(run.editDistance * 100).toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <TrendIndicator trend={runTrend} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Variance */}
      <div className="mt-6 p-4 bg-paper border">
        <p className="text-sm text-ink-72">
          <span className="font-medium">Variance:</span>{" "}
          {metrics.variance.toFixed(4)} (standard deviation of edit distances across runs)
        </p>
      </div>
    </main>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: "improving" | "declining" | "stable" }) {
  switch (trend) {
    case "improving":
      return <span className="text-ink-72 text-lg" aria-label="improving">&#x2191;</span>;
    case "declining":
      return <span className="text-ink-72 text-lg" aria-label="declining">&#x2193;</span>;
    default:
      return <span className="text-ink-35 text-lg" aria-label="stable">&#x2192;</span>;
  }
}

function getRunTrend(
  current: EvalRunSummary,
  previous: EvalRunSummary | undefined
): "improving" | "declining" | "stable" {
  if (!previous) return "stable";
  if (current.factScore !== null && previous.factScore !== null) {
    if (current.factScore > previous.factScore) return "improving";
    if (current.factScore < previous.factScore) return "declining";
  }
  return "stable";
}
