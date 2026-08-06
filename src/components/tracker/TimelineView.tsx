"use client";

import { useState, useEffect } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface TimelineEvent {
  id: string;
  jobId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  occurredAt: string;
  notes: string | null;
}

interface TimelineViewProps {
  jobs: { id: string; title: string; company: string }[];
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  status_change: "\u{1F504}",
  note_added: "\u{1F4DD}",
  interview_scheduled: "\u{1F4C5}",
  offer_received: "\u{1F389}",
  follow_up: "\u{1F4E8}",
  application_submitted: "\u{1F4E4}",
  rejection: "\u274C",
  contact_added: "\u{1F465}",
};

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "status_change", label: "Status Change" },
  { value: "note_added", label: "Note Added" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "offer_received", label: "Offer Received" },
  { value: "follow_up", label: "Follow Up" },
  { value: "application_submitted", label: "Application Submitted" },
  { value: "rejection", label: "Rejection" },
  { value: "contact_added", label: "Contact Added" },
];

export default function TimelineView({ jobs }: TimelineViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterJob, setFilterJob] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const params = new URLSearchParams();
        if (filterJob) params.set("jobId", filterJob);
        if (filterType) params.set("eventType", filterType);

        const res = await fetch(`/api/tracker/events?${params.toString()}`);
        if (cancelled) return;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (!cancelled) setError(extractErrorMessage(errData, "Failed to load events"));
          return;
        }
        const data = await res.json();
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [filterJob, filterType]);

  const getJobLabel = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job ? `${job.title} @ ${job.company}` : "Unknown Job";
  };

  if (loading) {
    return <p className="text-center text-gray-400 py-12">Loading timeline...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3" role="group" aria-label="Timeline filters">
        <select
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          aria-label="Filter by job"
        >
          <option value="">All Jobs</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} - {job.company}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          aria-label="Filter by event type"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No events recorded yet.</p>
          <p className="text-xs text-gray-300 mt-1">Events are created automatically when you move jobs between stages.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4" role="list" aria-label="Application events timeline">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />

          {events.map((event) => (
            <div key={event.id} className="relative" role="listitem">
              {/* Dot */}
              <div className="absolute -left-3.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-400" aria-hidden="true" />

              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm ml-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">
                      {EVENT_TYPE_ICONS[event.eventType] || "\u{1F4CC}"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {event.eventType.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500">{getJobLabel(event.jobId)}</p>
                    </div>
                  </div>
                  <time className="text-xs text-gray-400 shrink-0" dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                {event.fromStatus && event.toStatus && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    <span className="capitalize">{event.fromStatus}</span>
                    {" \u2192 "}
                    <span className="capitalize">{event.toStatus}</span>
                  </p>
                )}
                {event.notes && (
                  <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded p-2">
                    {event.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
