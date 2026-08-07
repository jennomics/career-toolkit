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

const EVENT_TYPE_LABELS: Record<string, string> = {
  status_change: "Status change",
  note_added: "Note added",
  interview_scheduled: "Interview scheduled",
  offer_received: "Offer received",
  follow_up: "Follow up",
  application_submitted: "Application submitted",
  rejection: "Rejection",
  contact_added: "Contact added",
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
    return <p className="text-center text-ink-35 py-s-5 text-body">Loading timeline...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-t border-rule p-s-2 text-live text-body" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-s-3" role="group" aria-label="Timeline filters">
        <select
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          className="border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
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
          className="border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
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
        <div className="text-center py-s-5">
          <p className="text-body text-ink-35">No events recorded yet.</p>
          <p className="text-meta text-ink-35 mt-1 font-mono">Events are created automatically when you move jobs between stages.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-0" role="list" aria-label="Application events timeline">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-rule" aria-hidden="true" />

          {events.map((event) => (
            <div key={event.id} className="relative border-t border-rule py-s-2" role="listitem">
              {/* Dot */}
              <div className="absolute -left-[17px] top-4 w-1.5 h-1.5 rounded-full bg-ink" aria-hidden="true" />

              <div className="ml-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-meta uppercase tracking-widest text-ink-50">
                      {EVENT_TYPE_LABELS[event.eventType] || event.eventType.replace(/_/g, " ")}
                    </p>
                    <p className="text-list text-ink-72 mt-0.5">{getJobLabel(event.jobId)}</p>
                  </div>
                  <time className="font-mono text-meta text-ink-50 shrink-0" dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                {event.fromStatus && event.toStatus && (
                  <p className="font-mono text-meta text-ink-50 mt-1">
                    <span className="capitalize">{event.fromStatus}</span>
                    {" \u2192 "}
                    <span className="capitalize">{event.toStatus}</span>
                  </p>
                )}
                {event.notes && (
                  <p className="text-list text-ink-72 mt-1">
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
