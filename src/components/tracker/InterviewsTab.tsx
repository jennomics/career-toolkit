"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface Interview {
  id: string;
  jobId: string;
  round: number;
  interviewType: string;
  scheduledAt: string;
  durationMinutes: number | null;
  interviewers: string | null;
  location: string | null;
  meetingLink: string | null;
  notes: string | null;
  outcome: string;
}

interface InterviewsTabProps {
  jobId: string;
}

const INTERVIEW_TYPES = ["phone", "video", "onsite", "technical", "behavioral", "panel", "other"];
const OUTCOMES = ["pending", "passed", "failed", "cancelled", "rescheduled"];

export default function InterviewsTab({ jobId }: InterviewsTabProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    interviewType: "video",
    scheduledAt: "",
    durationMinutes: "",
    interviewers: "",
    location: "",
    meetingLink: "",
    notes: "",
    outcome: "pending",
    round: "1",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchInterviews = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/tracker/interviews?jobId=${jobId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to load interviews"));
        return;
      }
      setInterviews(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchInterviews();
    }
  }, [fetchInterviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tracker/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          interviewType: formData.interviewType,
          scheduledAt: formData.scheduledAt,
          durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
          interviewers: formData.interviewers || null,
          location: formData.location || null,
          meetingLink: formData.meetingLink || null,
          notes: formData.notes || null,
          outcome: formData.outcome,
          round: parseInt(formData.round) || 1,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to create interview"));
        return;
      }
      setShowForm(false);
      setFormData({
        interviewType: "video",
        scheduledAt: "",
        durationMinutes: "",
        interviewers: "",
        location: "",
        meetingLink: "",
        notes: "",
        outcome: "pending",
        round: "1",
      });
      fetchInterviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create interview");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-ink-35 py-s-4 text-body">Loading interviews...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-t border-rule p-s-2 text-live text-body" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-mono text-meta uppercase tracking-widest text-ink-50">
          Interviews ({interviews.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          {showForm ? "Cancel" : "Add interview"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-t border-rule pt-s-2 space-y-3">
          <div className="grid grid-cols-2 gap-s-3">
            <div>
              <label htmlFor="interviewType" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Type
              </label>
              <select
                id="interviewType"
                value={formData.interviewType}
                onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="round" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Round
              </label>
              <input
                id="round"
                type="number"
                min="1"
                value={formData.round}
                onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="scheduledAt" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Scheduled at
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              required
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-s-3">
            <div>
              <label htmlFor="durationMinutes" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Duration (min)
              </label>
              <input
                id="durationMinutes"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
                placeholder="60"
              />
            </div>
            <div>
              <label htmlFor="outcome" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Outcome
              </label>
              <select
                id="outcome"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="interviewers" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Interviewers (optional)
            </label>
            <input
              id="interviewers"
              type="text"
              value={formData.interviewers}
              onChange={(e) => setFormData({ ...formData, interviewers: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
              placeholder="John Doe, Jane Smith"
            />
          </div>
          <div>
            <label htmlFor="meetingLink" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Meeting link / location (optional)
            </label>
            <input
              id="meetingLink"
              type="text"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
              placeholder="https://zoom.us/..."
            />
          </div>
          <div>
            <label htmlFor="interviewNotes" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Notes (optional)
            </label>
            <textarea
              id="interviewNotes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none resize-none"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add interview"}
          </button>
        </form>
      )}

      {interviews.length === 0 && !showForm ? (
        <div className="text-center py-s-4">
          <p className="text-body text-ink-35">No interviews scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {interviews.map((interview) => (
            <div key={interview.id} className="border-t border-rule py-s-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body font-medium text-ink capitalize">
                    Round {interview.round}: {interview.interviewType}
                  </p>
                  <time className="font-mono text-meta text-ink-50" dateTime={interview.scheduledAt}>
                    {new Date(interview.scheduledAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  {interview.durationMinutes && (
                    <span className="font-mono text-meta text-ink-35 ml-2">
                      ({interview.durationMinutes} min)
                    </span>
                  )}
                </div>
                <span className="font-mono text-meta text-ink-50 capitalize">
                  {interview.outcome}
                </span>
              </div>
              {interview.interviewers && (
                <p className="text-list text-ink-72 mt-1">With: {interview.interviewers}</p>
              )}
              {interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline text-list min-h-[var(--target-min)] inline-flex items-center mt-1"
                >
                  Meeting link
                </a>
              )}
              {interview.notes && (
                <p className="text-list text-ink-72 mt-1">
                  {interview.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
