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
      const res = await fetch(`/api/packages?jobId=${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setDocuments([]);
          return;
        }
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to load documents"));
        return;
      }
      const data = await res.json();
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
    return <p className="text-center text-ink-35 py-s-4 text-body">Loading documents...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-t border-rule p-s-2 text-live text-body" role="alert">
          {error}
        </div>
      )}

      <h3 className="font-mono text-meta uppercase tracking-widest text-ink-50">
        Documents ({documents.length})
      </h3>

      {documents.length === 0 ? (
        <div className="text-center py-s-4">
          <p className="text-body text-ink-35">No documents linked to this job yet.</p>
          <p className="text-meta text-ink-35 mt-1 font-mono">
            Application packages and resume projects will appear here when linked.
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {documents.map((doc) => (
            <div key={doc.id} className="border-t border-rule py-s-2 flex items-center justify-between">
              <div>
                <p className="text-body font-medium text-ink">{doc.title}</p>
                <p className="font-mono text-meta text-ink-50 capitalize">{doc.type}</p>
              </div>
              <time className="font-mono text-meta text-ink-50" dateTime={doc.createdAt}>
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
