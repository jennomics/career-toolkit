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
    return <p className="text-center text-gray-400 py-8">Loading follow-ups...</p>;
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
          Follow-ups ({followUps.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Add Follow-up"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <label htmlFor="followUpAction" className="block text-xs font-medium text-gray-600 mb-1">
              Action *
            </label>
            <input
              id="followUpAction"
              type="text"
              required
              value={formData.action}
              onChange={(e) => setFormData({ ...formData, action: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              placeholder="Send thank-you email to recruiter"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="followUpDueDate" className="block text-xs font-medium text-gray-600 mb-1">
                Due Date *
              </label>
              <input
                id="followUpDueDate"
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="followUpPriority" className="block text-xs font-medium text-gray-600 mb-1">
                Priority
              </label>
              <select
                id="followUpPriority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="followUpNotes" className="block text-xs font-medium text-gray-600 mb-1">
              Notes
            </label>
            <textarea
              id="followUpNotes"
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
            {submitting ? "Adding..." : "Add Follow-up"}
          </button>
        </form>
      )}

      {followUps.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No follow-ups for this job yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {followUps.map((fu) => (
            <div
              key={fu.id}
              className={`bg-white border rounded-lg p-3 ${
                isOverdue(fu.dueDate, fu.completedAt)
                  ? "border-red-200 bg-red-50/50"
                  : fu.completedAt
                  ? "border-gray-200 opacity-60"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(fu)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                    fu.completedAt
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300 hover:border-blue-400"
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
                  <p className={`text-sm font-medium ${fu.completedAt ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {fu.action}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <time
                      className={`text-xs ${isOverdue(fu.dueDate, fu.completedAt) ? "text-red-500 font-medium" : "text-gray-500"}`}
                      dateTime={fu.dueDate}
                    >
                      Due: {new Date(fu.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </time>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${
                        fu.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : fu.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {fu.priority}
                    </span>
                  </div>
                  {fu.notes && (
                    <p className="text-xs text-gray-500 mt-1">{fu.notes}</p>
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
