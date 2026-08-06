"use client";

import { useEffect, useState, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { PIPELINE_STAGES } from "@/lib/tracker-helpers";

interface AnalyticsData {
  totalJobs: number;
  stageCounts: Record<string, number>;
  avgTimeInStageDays: Record<string, number>;
  conversionRates: { from: string; to: string; rate: number }[];
}

const STAGE_LABELS: Record<string, string> = {
  saved: "Saved",
  researching: "Researching",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  "final-round": "Final Round",
  offer: "Offer",
  negotiating: "Negotiating",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed: "Closed",
};

const FUNNEL_COLORS: Record<string, string> = {
  saved: "bg-gray-400",
  researching: "bg-indigo-400",
  applied: "bg-blue-400",
  screening: "bg-cyan-400",
  interviewing: "bg-yellow-400",
  "final-round": "bg-orange-400",
  offer: "bg-green-400",
  negotiating: "bg-emerald-400",
  accepted: "bg-green-600",
  rejected: "bg-red-400",
  withdrawn: "bg-amber-400",
  closed: "bg-gray-300",
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ""}`} />;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/tracker/analytics");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(extractErrorMessage(errData, "Failed to load analytics"));
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading analytics">
        <SkeletonBlock className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!data || data.totalJobs === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md mx-auto shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">No analytics yet</h3>
          <p className="text-sm text-gray-500 mt-2">
            Add jobs to your pipeline to see conversion funnels, time-in-stage averages, and more.
          </p>
        </div>
      </div>
    );
  }

  const maxStageCount = Math.max(...Object.values(data.stageCounts), 1);
  const activeStages = PIPELINE_STAGES.filter(
    (s) => !["rejected", "withdrawn", "closed"].includes(s)
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Applications</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalJobs}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active Pipeline</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {activeStages.reduce((sum, s) => sum + (data.stageCounts[s] || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">in active stages</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Overall Conversion</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {data.conversionRates.length > 0
              ? `${data.conversionRates[data.conversionRates.length - 1].rate}%`
              : "0%"}
          </p>
          <p className="text-xs text-gray-400 mt-1">saved to accepted</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <section aria-labelledby="funnel-heading">
        <h3 id="funnel-heading" className="text-base font-semibold text-gray-900 mb-4">
          Conversion Funnel
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="space-y-3">
            {activeStages.map((stage) => {
              const count = data.stageCounts[stage] || 0;
              const widthPercent = maxStageCount > 0 ? Math.max((count / maxStageCount) * 100, 2) : 2;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24 text-right shrink-0">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${FUNNEL_COLORS[stage] || "bg-gray-300"}`}
                      style={{ width: `${widthPercent}%` }}
                      role="progressbar"
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={maxStageCount}
                      aria-label={`${STAGE_LABELS[stage]}: ${count} jobs`}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-700">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conversion Rates */}
      {data.conversionRates.length > 0 && (
        <section aria-labelledby="conversion-heading">
          <h3 id="conversion-heading" className="text-base font-semibold text-gray-900 mb-4">
            Stage-to-Stage Conversion
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {data.conversionRates.map(({ from, to, rate }) => (
                <div
                  key={`${from}-${to}`}
                  className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                >
                  <span className="text-xs text-gray-500">{STAGE_LABELS[from]}</span>
                  <span className="text-gray-300" aria-hidden="true">&rarr;</span>
                  <span className="text-xs text-gray-500">{STAGE_LABELS[to]}</span>
                  <span
                    className={`text-xs font-bold ml-1 ${
                      rate >= 50 ? "text-green-600" : rate >= 25 ? "text-yellow-600" : "text-red-600"
                    }`}
                  >
                    {rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Average Time in Stage */}
      {Object.keys(data.avgTimeInStageDays).length > 0 && (
        <section aria-labelledby="time-heading">
          <h3 id="time-heading" className="text-base font-semibold text-gray-900 mb-4">
            Average Time in Stage (Days)
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="space-y-2">
              {Object.entries(data.avgTimeInStageDays)
                .filter(([, days]) => days > 0)
                .sort(([a], [b]) => {
                  const ai = PIPELINE_STAGES.indexOf(a as typeof PIPELINE_STAGES[number]);
                  const bi = PIPELINE_STAGES.indexOf(b as typeof PIPELINE_STAGES[number]);
                  return ai - bi;
                })
                .map(([stage, days]) => {
                  const maxDays = Math.max(...Object.values(data.avgTimeInStageDays), 1);
                  const widthPercent = Math.max((days / maxDays) * 100, 5);
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-24 text-right shrink-0">
                        {STAGE_LABELS[stage] || stage}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden relative">
                        <div
                          className="h-full rounded-md bg-purple-400 transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                          role="progressbar"
                          aria-valuenow={days}
                          aria-valuemin={0}
                          aria-valuemax={maxDays}
                          aria-label={`${STAGE_LABELS[stage] || stage}: ${days} days average`}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-gray-700">
                          {days}d
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
            {Object.values(data.avgTimeInStageDays).every((d) => d === 0) && (
              <p className="text-xs text-gray-400 text-center py-4">
                Not enough stage transitions yet to calculate averages.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
