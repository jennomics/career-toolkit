"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Nav from "@/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoicePassage {
  id: string;
  passageText: string;
  topics: string[];
  speakerIsUser: boolean;
  createdAt: string;
}

interface SourceDocument {
  id: string;
  title: string;
  category: string;
  authorship: string;
  authorName: string | null;
  documentDate: string;
  uploadDate: string;
  content: string;
  confidential: boolean;
  currentEmployer: boolean;
  passages?: VoicePassage[];
  _count?: { passages: number };
}

type Category =
  | "work-artifact"
  | "third-party-evidence"
  | "archived-posting"
  | "prior-application"
  | "critique-rejected-draft"
  | "compensation-record";

type Authorship = "user-authored" | "third-party" | "collaborative" | "unknown";

const CATEGORIES: Category[] = [
  "work-artifact",
  "third-party-evidence",
  "archived-posting",
  "prior-application",
  "critique-rejected-draft",
  "compensation-record",
];

const CATEGORY_LABELS: Record<Category, string> = {
  "work-artifact": "Work Artifact",
  "third-party-evidence": "Third-Party Evidence",
  "archived-posting": "Archived Posting",
  "prior-application": "Prior Application",
  "critique-rejected-draft": "Critique / Rejected Draft",
  "compensation-record": "Compensation Record",
};

const AUTHORSHIPS: Authorship[] = ["user-authored", "third-party", "collaborative", "unknown"];

const AUTHORSHIP_LABELS: Record<Authorship, string> = {
  "user-authored": "User Authored",
  "third-party": "Third Party",
  "collaborative": "Collaborative",
  "unknown": "Unknown",
};

// ─── Category Badge ──────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const baseClasses = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
  const label = CATEGORY_LABELS[category as Category] || category;

  return (
    <span
      className={`${baseClasses} font-mono text-meta text-ink-50 border border-rule`}
      aria-label={`Category: ${label}`}
    >
      {label}
    </span>
  );
}

function AuthorshipBadge({ authorship }: { authorship: string }) {
  const baseClasses = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium";
  const label = AUTHORSHIP_LABELS[authorship as Authorship] || authorship;
  const colorClasses =
    authorship === "user-authored"
      ? "font-mono text-meta text-ink-50 border border-rule"
      : "border border-ink text-ink bg-transparent border border-rule";

  return (
    <span
      className={`${baseClasses} ${colorClasses}`}
      aria-label={`Authorship: ${label}`}
    >
      {label}
    </span>
  );
}

// ─── Upload Form ─────────────────────────────────────────────────────────────

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("work-artifact");
  const [authorship, setAuthorship] = useState<Authorship>("user-authored");
  const [authorName, setAuthorName] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [currentEmployer, setCurrentEmployer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category,
          authorship,
          authorName: authorName || undefined,
          documentDate,
          confidential,
          currentEmployer,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Failed to create document");
        return;
      }

      // Reset form
      setTitle("");
      setContent("");
      setCategory("work-artifact");
      setAuthorship("user-authored");
      setAuthorName("");
      setDocumentDate("");
      setConfidential(false);
      setCurrentEmployer(false);
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Upload document form">
      {error && (
        <div className="border border-rule rounded p-3 text-sm text-ink-72" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="doc-title" className="block text-sm font-medium text-ink-72 mb-1">
          Title <span className="text-ink-50">*</span>
        </label>
        <input
          id="doc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ink"
          aria-required="true"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="doc-category" className="block text-sm font-medium text-ink-72 mb-1">
            Category <span className="text-ink-50">*</span>
          </label>
          <select
            id="doc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            required
            className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ink"
            aria-required="true"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-authorship" className="block text-sm font-medium text-ink-72 mb-1">
            Authorship <span className="text-ink-50">*</span>
          </label>
          <select
            id="doc-authorship"
            value={authorship}
            onChange={(e) => setAuthorship(e.target.value as Authorship)}
            required
            className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ink"
            aria-required="true"
          >
            {AUTHORSHIPS.map((auth) => (
              <option key={auth} value={auth}>
                {AUTHORSHIP_LABELS[auth]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {authorship !== "user-authored" && (
        <div>
          <label htmlFor="doc-author-name" className="block text-sm font-medium text-ink-72 mb-1">
            Author Name
          </label>
          <input
            id="doc-author-name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ink"
          />
        </div>
      )}

      <div>
        <label htmlFor="doc-date" className="block text-sm font-medium text-ink-72 mb-1">
          Document Date <span className="text-ink-50">*</span>
        </label>
        <input
          id="doc-date"
          type="date"
          value={documentDate}
          onChange={(e) => setDocumentDate(e.target.value)}
          required
          className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ink"
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="doc-content" className="block text-sm font-medium text-ink-72 mb-1">
          Content <span className="text-ink-50">*</span>
        </label>
        <textarea
          id="doc-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={8}
          className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-2 focus:ring-ink"
          aria-required="true"
          placeholder="Paste the document content here..."
        />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-ink-72 cursor-pointer">
          <input
            type="checkbox"
            checked={confidential}
            onChange={(e) => setConfidential(e.target.checked)}
            className="rounded border-rule"
          />
          Confidential
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-72 cursor-pointer">
          <input
            type="checkbox"
            checked={currentEmployer}
            onChange={(e) => setCurrentEmployer(e.target.checked)}
            className="rounded border-rule"
          />
          Current Employer
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="border-[1.5px] border-live text-live bg-transparent px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-ink"
        aria-label="Upload document"
      >
        {submitting ? "Uploading..." : "Upload Document"}
      </button>
    </form>
  );
}

// ─── Document Detail ─────────────────────────────────────────────────────────

function DocumentDetail({
  document,
  onClose,
  onDelete,
}: {
  document: SourceDocument;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [passages, setPassages] = useState<VoicePassage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/documents/${document.id}`);
        if (res.ok) {
          const data = await res.json();
          setPassages(data.passages || []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [document.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document and all its passages?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(document.id);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Document: ${document.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-medium text-ink">{document.title}</h2>
            <div className="flex gap-2 mt-2">
              <CategoryBadge category={document.category} />
              <AuthorshipBadge authorship={document.authorship} />
              {document.confidential && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono text-meta text-ink-50 border border-rule">
                  Confidential
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-35 text-2xl leading-none"
            aria-label="Close document detail"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3 text-sm text-ink-72 mb-4">
          <p>
            <span className="font-medium">Document Date:</span>{" "}
            {new Date(document.documentDate).toLocaleDateString()}
          </p>
          {document.authorName && (
            <p>
              <span className="font-medium">Author:</span> {document.authorName}
            </p>
          )}
          <p>
            <span className="font-medium">Uploaded:</span>{" "}
            {new Date(document.uploadDate).toLocaleDateString()}
          </p>
        </div>

        <div className="border-t pt-4 mb-4">
          <h3 className="text-sm font-medium text-ink-72 mb-2">Content</h3>
          <div className="bg-paper border rounded p-3 text-sm text-ink whitespace-pre-wrap max-h-40 overflow-y-auto">
            {document.content}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-ink-72 mb-2">
            Passages ({loading ? "..." : passages.length})
          </h3>
          {loading ? (
            <p className="text-sm text-ink-50">Loading passages...</p>
          ) : passages.length === 0 ? (
            <p className="text-sm text-ink-50 italic">
              No passages extracted yet. Run document ingestion to create passages.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {passages.map((passage) => (
                <div
                  key={passage.id}
                  className="bg-paper border border-rule rounded p-3 text-sm"
                >
                  <p className="text-ink">{passage.passageText}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {passage.topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-mono text-meta text-ink-50"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-4 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border-[1.5px] border-live bg-transparent text-live px-4 py-2 text-sm font-medium disabled:opacity-50 focus:ring-2 focus:ring-ink"
            aria-label="Delete document"
          >
            {deleting ? "Deleting..." : "Delete Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SourceDocument | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const fetchedRef = useRef(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);
      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchDocuments();
    }
  }, [fetchDocuments]);

  useEffect(() => {
    fetchedRef.current = false;
  }, [filterCategory]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchDocuments();
    }
  }, [fetchDocuments, filterCategory]);

  const handleUploadSuccess = () => {
    setShowForm(false);
    fetchedRef.current = false;
    fetchDocuments().then(() => { fetchedRef.current = true; });
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedDoc(null);
  };

  // Group documents by category
  const grouped = documents.reduce<Record<string, SourceDocument[]>>((acc, doc) => {
    const cat = doc.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Voice Corpus Documents" subtitle="Upload and manage documents for voice analysis" />
      <main className="max-w-[720px] mx-auto px-4 py-8" aria-label="Document management">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="border-[1.5px] border-live text-live bg-transparent px-4 py-2 rounded text-sm font-medium focus:ring-2 focus:ring-ink"
          aria-expanded={showForm}
          aria-controls="upload-form"
        >
          {showForm ? "Cancel" : "Upload Document"}
        </button>
      </div>

      {showForm && (
        <div id="upload-form" className="mb-8 border-t border-rule pt-s-3">
          <h2 className="text-lg font-medium text-ink mb-4">Upload New Document</h2>
          <UploadForm onSuccess={handleUploadSuccess} />
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="filter-category" className="text-sm font-medium text-ink-72 mr-2">
          Filter by category:
        </label>
        <select
          id="filter-category"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-rule rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-ink"
          aria-label="Filter documents by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-50" aria-live="polite">
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-ink-50" aria-live="polite">
          <p className="text-lg">No documents yet.</p>
          <p className="text-sm mt-1">Upload your first document to start building your voice corpus.</p>
        </div>
      ) : (
        <div className="space-y-6" role="list" aria-label="Documents grouped by category">
          {CATEGORIES.filter((cat) => grouped[cat]?.length).map((cat) => (
            <section key={cat} aria-label={`${CATEGORY_LABELS[cat]} documents`}>
              <h2 className="text-lg font-medium text-ink mb-3 border-b pb-2">
                {CATEGORY_LABELS[cat]}
                <span className="text-sm font-normal text-ink-50 ml-2">
                  ({grouped[cat].length})
                </span>
              </h2>
              <div className="space-y-2" role="list">
                {grouped[cat].map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="w-full text-left border-t border-rule pt-s-2 hover:border-rule focus:ring-2 focus:ring-ink focus:outline-none"
                    aria-label={`View document: ${doc.title}`}
                    role="listitem"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-ink">{doc.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <AuthorshipBadge authorship={doc.authorship} />
                          {doc.confidential && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono text-meta text-ink-50 border border-rule">
                              Confidential
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-ink-50">
                        <p>{new Date(doc.documentDate).toLocaleDateString()}</p>
                        <p className="mt-1">
                          {doc._count?.passages ?? 0} passage{(doc._count?.passages ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocumentDetail
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={handleDelete}
        />
      )}
    </main>
    </div>
  );
}
