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

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-rule ${className || ""}`} />;
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
      <div className="border-t border-rule p-s-3 text-live text-body" role="alert">
        {error}
      </div>
    );
  }

  if (!data || data.totalJobs === 0) {
    return (
      <div className="text-center py-s-5">
        <div className="border-t border-rule pt-s-4 max-w-md mx-auto">
          <h3 className="text-h3 font-light text-ink">No analytics yet</h3>
          <p className="text-body text-ink-50 mt-s-1">
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
      {/* Summary Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
        <div className="border-t border-rule py-s-3 px-s-2">
          <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Total applications</p>
          <p className="font-mono text-h2 text-ink mt-s-1">{data.totalJobs}</p>
        </div>
        <div className="border-t border-rule py-s-3 px-s-2">
          <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Active pipeline</p>
          <p className="font-mono text-h2 text-ink mt-s-1">
            {activeStages.reduce((sum, s) => sum + (data.stageCounts[s] || 0), 0)}
          </p>
          <p className="font-mono text-meta text-ink-35 mt-0.5">in active stages</p>
        </div>
        <div className="border-t border-rule py-s-3 px-s-2">
          <p className="font-mono text-meta uppercase tracking-widest text-ink-50">Overall conversion</p>
          <p className="font-mono text-h2 text-ink mt-s-1">
            {data.conversionRates.length > 0
              ? `${data.conversionRates[data.conversionRates.length - 1].rate}%`
              : "0%"}
          </p>
          <p className="font-mono text-meta text-ink-35 mt-0.5">saved to accepted</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <section aria-labelledby="funnel-heading">
        <h3 id="funnel-heading" className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-s-3">
          Conversion funnel
        </h3>
        <div className="border-t border-rule pt-s-3">
          <div className="space-y-3">
            {activeStages.map((stage) => {
              const count = data.stageCounts[stage] || 0;
              const widthPercent = maxStageCount > 0 ? Math.max((count / maxStageCount) * 100, 2) : 2;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="font-mono text-meta text-ink-50 w-24 text-right shrink-0">
                    {STAGE_LABELS[stage]}
                  </span>
                  <div className="flex-1 h-7 bg-rule overflow-hidden relative">
                    <div
                      className="h-full bg-ink transition-all duration-200"
                      style={{ width: `${widthPercent}%` }}
                      role="progressbar"
                      aria-valuenow={count}
                      aria-valuemin={0}
                      aria-valuemax={maxStageCount}
                      aria-label={`${STAGE_LABELS[stage]}: ${count} jobs`}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center font-mono text-meta text-ink-50">
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
          <h3 id="conversion-heading" className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-s-3">
            Stage-to-stage conversion
          </h3>
          <div className="border-t border-rule pt-s-3">
            <div className="space-y-1">
              {data.conversionRates.map(({ from, to, rate }) => (
                <div
                  key={`${from}-${to}`}
                  className="flex items-center gap-s-2 py-s-1 border-t border-rule first:border-t-0"
                >
                  <span className="font-mono text-meta text-ink-50">{STAGE_LABELS[from]}</span>
                  <span className="text-ink-35" aria-hidden="true">&rarr;</span>
                  <span className="font-mono text-meta text-ink-50">{STAGE_LABELS[to]}</span>
                  <span className="font-mono text-meta text-ink ml-auto">
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
          <h3 id="time-heading" className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-s-3">
            Average time in stage (days)
          </h3>
          <div className="border-t border-rule pt-s-3">
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
                      <span className="font-mono text-meta text-ink-50 w-24 text-right shrink-0">
                        {STAGE_LABELS[stage] || stage}
                      </span>
                      <div className="flex-1 h-6 bg-rule overflow-hidden relative">
                        <div
                          className="h-full bg-ink transition-all duration-200"
                          style={{ width: `${widthPercent}%` }}
                          role="progressbar"
                          aria-valuenow={days}
                          aria-valuemin={0}
                          aria-valuemax={maxDays}
                          aria-label={`${STAGE_LABELS[stage] || stage}: ${days} days average`}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center font-mono text-meta text-ink-50">
                          {days}d
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
            {Object.values(data.avgTimeInStageDays).every((d) => d === 0) && (
              <p className="text-meta text-ink-35 text-center py-s-3 font-mono">
                Not enough stage transitions yet to calculate averages.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
