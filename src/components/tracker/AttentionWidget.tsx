"use client";

import { useEffect, useState, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface FollowUpItem {
  id: string;
  action: string;
  dueDate: string;
  job: { id: string; title: string; company: string };
}

interface StaleItem {
  id: string;
  title: string;
  company: string;
  status: string;
  daysSinceUpdate: number;
}

interface AttentionData {
  overdueFollowUps: FollowUpItem[];
  upcomingFollowUps: FollowUpItem[];
  staleApplications: StaleItem[];
  attentionCount: number;
}

interface AttentionWidgetProps {
  onJobClick?: (jobId: string) => void;
  compact?: boolean;
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded h-4 ${className || ""}`} />;
}

export default function AttentionWidget({ onJobClick, compact = false }: AttentionWidgetProps) {
  const [data, setData] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchAttention() {
      try {
        const res = await fetch("/api/tracker/attention");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(extractErrorMessage(errData, "Failed to load attention items"));
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load attention items");
      } finally {
        setLoading(false);
      }
    }

    fetchAttention();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading attention items">
        <SkeletonLine className="w-32" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
        {error}
      </div>
    );
  }

  if (!data || data.attentionCount === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">No items need attention right now.</p>
      </div>
    );
  }

  const maxItems = compact ? 5 : 20;

  return (
    <div className="space-y-4" aria-label="Items needing attention">
      {/* Overdue Follow-ups */}
      {data.overdueFollowUps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
            Overdue Follow-ups ({data.overdueFollowUps.length})
          </h4>
          <ul className="space-y-1.5">
            {data.overdueFollowUps.slice(0, maxItems).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onJobClick?.(item.job.id)}
                  className="w-full text-left px-3 py-2 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors cursor-pointer"
                  aria-label={`Overdue: ${item.action} for ${item.job.title} at ${item.job.company}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate">{item.action}</span>
                    <span className="text-xs text-red-500 shrink-0 ml-2">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {item.job.title} - {item.job.company}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stale Applications */}
      {data.staleApplications.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
            Stale Applications ({data.staleApplications.length})
          </h4>
          <ul className="space-y-1.5">
            {data.staleApplications.slice(0, maxItems).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onJobClick?.(item.id)}
                  className="w-full text-left px-3 py-2 bg-amber-50 border border-amber-100 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
                  aria-label={`Stale: ${item.title} at ${item.company}, ${item.daysSinceUpdate} days without activity`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate">{item.title}</span>
                    <span className="text-xs text-amber-600 shrink-0 ml-2">
                      {item.daysSinceUpdate}d idle
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {item.company} - {item.status}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming Follow-ups */}
      {data.upcomingFollowUps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            Upcoming Follow-ups ({data.upcomingFollowUps.length})
          </h4>
          <ul className="space-y-1.5">
            {data.upcomingFollowUps.slice(0, maxItems).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onJobClick?.(item.job.id)}
                  className="w-full text-left px-3 py-2 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                  aria-label={`Upcoming: ${item.action} for ${item.job.title} at ${item.job.company}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate">{item.action}</span>
                    <span className="text-xs text-blue-500 shrink-0 ml-2">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {item.job.title} - {item.job.company}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
