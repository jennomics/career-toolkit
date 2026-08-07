"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface FollowUp {
  id: string;
  jobId: string;
  action: string;
  dueDate: string;
  notes: string | null;
  priority: string;
  completedAt: string | null;
}

interface FollowUpsTabProps {
  jobId: string;
  onUpdated: () => void;
}

export default function FollowUpsTab({ jobId, onUpdated }: FollowUpsTabProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    action: "",
    dueDate: "",
    notes: "",
    priority: "medium",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/tracker/follow-ups?jobId=${jobId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to load follow-ups"));
        return;
      }
      setFollowUps(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchFollowUps();
    }
  }, [fetchFollowUps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tracker/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          action: formData.action,
          dueDate: formData.dueDate,
          notes: formData.notes || null,
          priority: formData.priority,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to create follow-up"));
        return;
      }
      setShowForm(false);
      setFormData({ action: "", dueDate: "", notes: "", priority: "medium" });
      fetchFollowUps();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (followUp: FollowUp) => {
    try {
      const completed = followUp.completedAt ? null : new Date().toISOString();
      const res = await fetch(`/api/tracker/follow-ups/${followUp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: completed }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to update follow-up"));
        return;
      }
      fetchFollowUps();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  };

  const isOverdue = (dueDate: string, completedAt: string | null) => {
    if (completedAt) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return <p className="text-center text-ink-35 py-s-4 text-body">Loading follow-ups...</p>;
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
          Follow-ups ({followUps.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          {showForm ? "Cancel" : "Add follow-up"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border-t border-rule pt-s-2 space-y-3">
          <div>
            <label htmlFor="followUpAction" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Action
            </label>
            <input
              id="followUpAction"
              type="text"
              required
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
              placeholder="Send thank-you email to recruiter"
            />
          </div>
          <div className="grid grid-cols-2 gap-s-3">
            <div>
              <label htmlFor="followUpDueDate" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Due date
              </label>
              <input
                id="followUpDueDate"
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="followUpPriority" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                Priority
              </label>
              <select
                id="followUpPriority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="followUpNotes" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
              Notes (optional)
            </label>
            <textarea
              id="followUpNotes"
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
            {submitting ? "Adding..." : "Add follow-up"}
          </button>
        </form>
      )}

      {followUps.length === 0 && !showForm ? (
        <div className="text-center py-s-4">
          <p className="text-body text-ink-35">No follow-ups for this job yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {followUps.map((fu) => (
            <div
              key={fu.id}
              className={`border-t border-rule py-s-2 ${
                fu.completedAt ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-s-2">
                <button
                  onClick={() => toggleComplete(fu)}
                  className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center shrink-0 cursor-pointer min-h-[var(--target-min)] min-w-[var(--target-min)] ${
                    fu.completedAt
                      ? "bg-ink border-ink text-paper"
                      : "border-rule"
                  }`}
                  aria-label={fu.completedAt ? "Mark as incomplete" : "Mark as complete"}
                >
                  {fu.completedAt && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <p className={`text-body ${fu.completedAt ? "line-through text-ink-35" : "text-ink"}`}>
                    {fu.action}
                  </p>
                  <div className="flex items-center gap-s-2 mt-1">
                    <time
                      className={`font-mono text-meta ${isOverdue(fu.dueDate, fu.completedAt) ? "text-live" : "text-ink-50"}`}
                      dateTime={fu.dueDate}
                    >
                      Due: {new Date(fu.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </time>
                    <span className="font-mono text-meta text-ink-50 capitalize">
                      {fu.priority}
                    </span>
                  </div>
                  {fu.notes && (
                    <p className="text-list text-ink-72 mt-1">{fu.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
