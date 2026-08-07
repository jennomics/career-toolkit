"use client";

import { useState, useEffect } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import { type TrackerJob } from "./PipelineCard";
import InterviewsTab from "./InterviewsTab";
import ContactsTab from "./ContactsTab";
import FollowUpsTab from "./FollowUpsTab";
import DocumentsTab from "./DocumentsTab";

interface DetailDrawerProps {
  job: TrackerJob | null;
  onClose: () => void;
  onJobUpdated: () => void;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  occurredAt: string;
  notes: string | null;
}

type TabKey = "timeline" | "interviews" | "contacts" | "follow-ups" | "documents";

const TABS: { key: TabKey; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "interviews", label: "Interviews" },
  { key: "contacts", label: "Contacts" },
  { key: "follow-ups", label: "Follow-ups" },
  { key: "documents", label: "Documents" },
];

export default function DetailDrawer({ job, onClose, onJobUpdated }: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job || activeTab !== "timeline") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/tracker/events?jobId=${job!.id}`);
        if (cancelled) return;
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (!cancelled) setError(extractErrorMessage(errData, "Failed to load timeline"));
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setEvents(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load timeline");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [job, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${job.title} at ${job.company}`}
        className="fixed right-0 top-0 h-full w-full max-w-lg border-l border-rule bg-paper z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-s-4 py-s-3 border-b border-rule flex items-start justify-between">
          <div>
            <h2 className="text-h2 font-light text-ink">{job.title}</h2>
            <p className="text-body text-ink-72">{job.company}</p>
            {job.salary && (
              <p className="font-mono text-meta text-ink-50 mt-0.5">{job.salary}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-50 cursor-pointer min-h-[var(--target-min)] min-w-[var(--target-min)] inline-flex items-center justify-center"
            aria-label="Close detail drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-rule px-s-4" role="tablist" aria-label="Job detail tabs">
          <div className="flex gap-s-3 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`panel-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`py-s-1 text-body font-medium border-b-2 cursor-pointer min-h-[var(--target-min)] ${
                  activeTab === tab.key
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-s-4 py-s-3" id={`panel-${activeTab}`} role="tabpanel">
          {activeTab === "timeline" && (
            <>
              {error && (
                <div className="border-t border-rule p-s-2 text-live text-body mb-s-2" role="alert">
                  {error}
                </div>
              )}
              {loading ? (
                <p className="text-center text-ink-35 py-s-4 text-body">Loading timeline...</p>
              ) : events.length === 0 ? (
                <div className="text-center py-s-4">
                  <p className="text-body text-ink-35">No events yet for this job.</p>
                  <p className="text-meta text-ink-35 mt-1 font-mono">
                    Events are logged when status changes or actions occur.
                  </p>
                </div>
              ) : (
                <div className="space-y-0" role="list" aria-label="Job timeline events">
                  {events.map((event) => (
                    <div key={event.id} className="flex gap-s-2 border-t border-rule py-s-2" role="listitem">
                      <div className="w-1.5 h-1.5 rounded-full bg-ink mt-2 shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-mono text-meta text-ink-50 uppercase tracking-widest capitalize">
                          {event.eventType.replace(/_/g, " ")}
                        </p>
                        {event.fromStatus && event.toStatus && (
                          <p className="font-mono text-meta text-ink-50">
                            {event.fromStatus} {"\u2192"} {event.toStatus}
                          </p>
                        )}
                        {event.notes && (
                          <p className="text-list text-ink-72 mt-0.5">{event.notes}</p>
                        )}
                        <time className="font-mono text-meta text-ink-35" dateTime={event.occurredAt}>
                          {new Date(event.occurredAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {activeTab === "interviews" && (
            <InterviewsTab jobId={job.id} />
          )}
          {activeTab === "contacts" && (
            <ContactsTab jobId={job.id} />
          )}
          {activeTab === "follow-ups" && (
            <FollowUpsTab jobId={job.id} onUpdated={onJobUpdated} />
          )}
          {activeTab === "documents" && (
            <DocumentsTab jobId={job.id} />
          )}
        </div>
      </aside>
    </>
  );
}
