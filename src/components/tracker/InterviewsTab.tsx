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
    return <p className="text-center text-gray-400 py-8">Loading interviews...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Interviews ({interviews.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Add Interview"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="interviewType" className="block text-xs font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                id="interviewType"
                value={formData.interviewType}
                onChange={(e) => setFormData({ ...formData, interviewType: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="round" className="block text-xs font-medium text-gray-600 mb-1">
                Round
              </label>
              <input
                id="round"
                type="number"
                min="1"
                value={formData.round}
                onChange={(e) => setFormData({ ...formData, round: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              />
            </div>
          </div>
          <div>
            <label htmlFor="scheduledAt" className="block text-xs font-medium text-gray-600 mb-1">
              Scheduled At *
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              required
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="durationMinutes" className="block text-xs font-medium text-gray-600 mb-1">
                Duration (min)
              </label>
              <input
                id="durationMinutes"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                placeholder="60"
              />
            </div>
            <div>
              <label htmlFor="outcome" className="block text-xs font-medium text-gray-600 mb-1">
                Outcome
              </label>
              <select
                id="outcome"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
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
            <label htmlFor="interviewers" className="block text-xs font-medium text-gray-600 mb-1">
              Interviewers
            </label>
            <input
              id="interviewers"
              type="text"
              value={formData.interviewers}
              onChange={(e) => setFormData({ ...formData, interviewers: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              placeholder="John Doe, Jane Smith"
            />
          </div>
          <div>
            <label htmlFor="meetingLink" className="block text-xs font-medium text-gray-600 mb-1">
              Meeting Link / Location
            </label>
            <input
              id="meetingLink"
              type="text"
              value={formData.meetingLink}
              onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              placeholder="https://zoom.us/..."
            />
          </div>
          <div>
            <label htmlFor="interviewNotes" className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              id="interviewNotes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 resize-none"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full text-sm font-medium bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Adding..." : "Add Interview"}
          </button>
        </form>
      )}

      {interviews.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No interviews scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interviews.map((interview) => (
            <div key={interview.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    Round {interview.round}: {interview.interviewType}
                  </p>
                  <time className="text-xs text-gray-500" dateTime={interview.scheduledAt}>
                    {new Date(interview.scheduledAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                  {interview.durationMinutes && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({interview.durationMinutes} min)
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                    interview.outcome === "passed"
                      ? "bg-green-100 text-green-700"
                      : interview.outcome === "failed"
                      ? "bg-red-100 text-red-700"
                      : interview.outcome === "cancelled"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {interview.outcome}
                </span>
              </div>
              {interview.interviewers && (
                <p className="text-xs text-gray-500 mt-1">With: {interview.interviewers}</p>
              )}
              {interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1 inline-block"
                >
                  Meeting Link
                </a>
              )}
              {interview.notes && (
                <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded p-2">
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
