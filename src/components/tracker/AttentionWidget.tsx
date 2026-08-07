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
  return <div className={`bg-rule h-4 ${className || ""}`} />;
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
      <div className="border-t border-rule p-s-2 text-live text-body" role="alert">
        {error}
      </div>
    );
  }

  if (!data || data.attentionCount === 0) {
    return (
      <div className="text-center py-s-3">
        <p className="text-body text-ink-35">No items need attention right now.</p>
      </div>
    );
  }

  const maxItems = compact ? 5 : 20;

  return (
    <div className="space-y-4" aria-label="Items needing attention">
      {/* Overdue Follow-ups */}
      {data.overdueFollowUps.length > 0 && (
        <div>
          <h4 className="font-mono text-meta uppercase tracking-widest text-ink mb-s-1">
            Overdue follow-ups ({data.overdueFollowUps.length})
          </h4>
          <ul className="space-y-0">
            {data.overdueFollowUps.slice(0, maxItems).map((item) => (
              <li key={item.id} className="border-t border-rule">
                <button
                  onClick={() => onJobClick?.(item.job.id)}
                  className="w-full text-left px-s-2 py-s-1 min-h-[var(--target-min)] cursor-pointer"
                  aria-label={`Overdue: ${item.action} for ${item.job.title} at ${item.job.company}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body text-ink truncate">{item.action}</span>
                    <span className="font-mono text-meta text-live shrink-0 ml-2">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-list text-ink-50 mt-0.5 truncate">
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
          <h4 className="font-mono text-meta uppercase tracking-widest text-ink mb-s-1">
            Stale applications ({data.staleApplications.length})
          </h4>
          <ul className="space-y-0">
            {data.staleApplications.slice(0, maxItems).map((item) => (
              <li key={item.id} className="border-t border-rule">
                <button
                  onClick={() => onJobClick?.(item.id)}
                  className="w-full text-left px-s-2 py-s-1 min-h-[var(--target-min)] cursor-pointer"
                  aria-label={`Stale: ${item.title} at ${item.company}, ${item.daysSinceUpdate} days without activity`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body text-ink truncate">{item.title}</span>
                    <span className="font-mono text-meta text-ink-50 shrink-0 ml-2">
                      {item.daysSinceUpdate}d idle
                    </span>
                  </div>
                  <p className="text-list text-ink-50 mt-0.5 truncate">
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
          <h4 className="font-mono text-meta uppercase tracking-widest text-ink mb-s-1">
            Upcoming follow-ups ({data.upcomingFollowUps.length})
          </h4>
          <ul className="space-y-0">
            {data.upcomingFollowUps.slice(0, maxItems).map((item) => (
              <li key={item.id} className="border-t border-rule">
                <button
                  onClick={() => onJobClick?.(item.job.id)}
                  className="w-full text-left px-s-2 py-s-1 min-h-[var(--target-min)] cursor-pointer"
                  aria-label={`Upcoming: ${item.action} for ${item.job.title} at ${item.job.company}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body text-ink truncate">{item.action}</span>
                    <span className="font-mono text-meta text-ink-50 shrink-0 ml-2">
                      {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-list text-ink-50 mt-0.5 truncate">
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
