"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface Document {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

interface DocumentsTabProps {
  jobId: string;
}

export default function DocumentsTab({ jobId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);
      // Fetch application packages linked to this job
      const res = await fetch(`/api/packages?jobId=${jobId}`);
      if (!res.ok) {
        // This endpoint may not exist - gracefully handle
        if (res.status === 404) {
          setDocuments([]);
          return;
        }
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to load documents"));
        return;
      }
      const data = await res.json();
      // Normalize to our Document interface
      const docs: Document[] = (Array.isArray(data) ? data : []).map(
        (d: { id: string; title?: string; name?: string; type?: string; createdAt: string }) => ({
          id: d.id,
          title: d.title || d.name || "Untitled",
          type: d.type || "package",
          createdAt: d.createdAt,
        })
      );
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchDocuments();
    }
  }, [fetchDocuments]);

  if (loading) {
    return <p className="text-center text-gray-400 py-8">Loading documents...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-700">
        Documents ({documents.length})
      </h3>

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No documents linked to this job yet.</p>
          <p className="text-xs text-gray-300 mt-1">
            Application packages and resume projects will appear here when linked.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                <p className="text-xs text-gray-500 capitalize">{doc.type}</p>
              </div>
              <time className="text-xs text-gray-400" dateTime={doc.createdAt}>
                {new Date(doc.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
