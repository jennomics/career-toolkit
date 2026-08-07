"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Nav from "@/components/Nav";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClaimArtifact {
  id: string;
  claimId: string;
  passageText: string;
  passageLocation: string | null;
  ingestionDate: string;
  freshnessWindow: number | null;
}

interface NegativeAssertion {
  id: string;
  claimId: string;
  forbiddenText: string;
  reason: string;
  correctedAt: string;
}

interface Claim {
  id: string;
  claimKey: string;
  statement: string;
  category: string;
  status: string;
  supersededById: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  artifacts: ClaimArtifact[];
  negativeAssertions: NegativeAssertion[];
}

type Category = "numeric" | "date" | "attribution" | "capability" | "narrative";

const CATEGORIES: Category[] = ["numeric", "date", "attribution", "capability", "narrative"];

const CATEGORY_LABELS: Record<Category, string> = {
  numeric: "Numeric",
  date: "Date",
  attribution: "Attribution",
  capability: "Capability",
  narrative: "Narrative",
};

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const baseClasses = "inline-flex items-center px-2 py-0.5 text-xs font-medium";
  let colorClasses: string;

  switch (status) {
    case "verified":
      colorClasses = "font-mono text-meta text-ink-50 border border-rule";
      break;
    case "unverified":
      colorClasses = "font-mono text-meta text-ink-50 border border-rule";
      break;
    case "superseded":
      colorClasses = "font-mono text-meta text-ink-35 border border-rule";
      break;
    default:
      colorClasses = "font-mono text-meta text-ink-50 border border-rule";
  }

  return (
    <span
      className={`${baseClasses} ${colorClasses}`}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}

// ─── Conflict Warning ────────────────────────────────────────────────────────

function ConflictWarning({ claims }: { claims: Claim[] }) {
  return (
    <div
      className="mt-2 flex items-center gap-2 text-ink-72 border border-rule px-3 py-2 text-sm"
      role="alert"
      aria-label="Conflicting claims detected"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span>
        {claims.length} claims share this key with different statements.
      </span>
    </div>
  );
}

// ─── Evidence Drawer ─────────────────────────────────────────────────────────

function EvidenceDrawer({ claim, isOpen, onToggle }: { claim: Claim; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="text-sm text-ink underline font-medium flex items-center gap-1"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Hide" : "Show"} evidence for claim: ${claim.statement.slice(0, 50)}`}
      >
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {claim.artifacts.length} artifact{claim.artifacts.length !== 1 ? "s" : ""}
      </button>
      {isOpen && (
        <div className="mt-2 ml-4 space-y-2" role="region" aria-label="Evidence artifacts">
          {claim.artifacts.length === 0 ? (
            <p className="text-sm text-ink-50 italic">No artifacts recorded.</p>
          ) : (
            claim.artifacts.map((artifact) => (
              <div key={artifact.id} className="bg-paper border border-rule p-3 text-sm">
                <p className="text-ink">{artifact.passageText}</p>
                {artifact.passageLocation && (
                  <p className="text-ink-50 mt-1 text-xs">Source: {artifact.passageLocation}</p>
                )}
                <p className="text-ink-35 mt-1 text-xs">
                  Ingested: {new Date(artifact.ingestionDate).toLocaleDateString()}
                  {artifact.freshnessWindow && ` (stale after ${artifact.freshnessWindow} days)`}
                </p>
              </div>
            ))
          )}
          {claim.negativeAssertions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-ink-72 mb-1">Negative Assertions (never say):</p>
              {claim.negativeAssertions.map((na) => (
                <div key={na.id} className="border border-rule px-3 py-2 text-sm text-ink mb-1">
                  <span className="font-mono">&ldquo;{na.forbiddenText}&rdquo;</span>
                  <span className="text-ink-72 text-xs ml-2">- {na.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Edit ─────────────────────────────────────────────────────────────

function InlineEdit({
  claim,
  onSave,
}: {
  claim: Claim;
  onSave: (id: string, newStatement: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(claim.statement);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value.trim() === claim.statement) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(claim.id, value.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(claim.statement);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-left w-full px-1 -mx-1"
        aria-label={`Edit claim: ${claim.statement.slice(0, 50)}`}
        title="Click to edit"
      >
        <span className="text-ink">{claim.statement}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border border-rule p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
        rows={2}
        aria-label="Edit claim statement"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
          if (e.key === "Enter" && e.metaKey) handleSave();
        }}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="px-3 py-1 border-[1.5px] border-live text-live bg-transparent text-xs disabled:opacity-50"
          aria-label="Save changes"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleCancel}
          className="px-3 py-1 border border-ink text-ink text-xs"
          aria-label="Cancel editing"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Correction Modal ────────────────────────────────────────────────────────

function CorrectionModal({
  claim,
  onClose,
  onSubmit,
  triggerRef,
}: {
  claim: Claim;
  onClose: () => void;
  onSubmit: (claimId: string, previousValue: string, correctedValue: string) => Promise<void>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [correctedValue, setCorrectedValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep focus within the modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute("disabled")
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus the first focusable element in the modal
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Restore focus to trigger button on close
  useEffect(() => {
    const trigger = triggerRef.current;
    return () => {
      // On unmount, return focus to the trigger button
      setTimeout(() => {
        trigger?.focus();
      }, 0);
    };
  }, [triggerRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedValue.trim()) {
      setError("Corrected value is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(claim.id, claim.statement, correctedValue.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Correct claim"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} className="max-w-lg w-full mx-4 p-6">
        <h3 className="text-lg font-medium text-ink mb-4">Correct This Claim</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-72 mb-1">
              Previous (incorrect) value
            </label>
            <p className="border border-rule px-3 py-2 text-sm text-ink">
              {claim.statement}
            </p>
          </div>
          <div className="mb-4">
            <label htmlFor="corrected-value" className="block text-sm font-medium text-ink-72 mb-1">
              Corrected value
            </label>
            <textarea
              id="corrected-value"
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              className="w-full border border-rule p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
              rows={3}
              placeholder="Enter the correct statement..."
              aria-required="true"
            />
          </div>
          {error && (
            <div className="mb-4 text-sm text-ink-72" role="alert">{error}</div>
          )}
          <p className="text-xs text-ink-50 mb-4">
            This will update the claim, create a correction record, and add a negative assertion
            to prevent the old value from appearing in generated output.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-ink text-ink text-sm"
              aria-label="Cancel correction"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !correctedValue.trim()}
              className="px-4 py-2 border-[1.5px] border-live bg-transparent text-live text-sm disabled:opacity-50"
              aria-label="Submit correction"
            >
              {submitting ? "Correcting..." : "Submit Correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Claim Card ──────────────────────────────────────────────────────────────

function ClaimCard({
  claim,
  conflicts,
  onUpdate,
  onCorrect,
}: {
  claim: Claim;
  conflicts: Claim[];
  onUpdate: (id: string, newStatement: string) => Promise<void>;
  onCorrect: (claimId: string, previousValue: string, correctedValue: string) => Promise<void>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const correctButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="border-t border-rule pt-s-3" role="article" aria-label={`Claim: ${claim.statement.slice(0, 60)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <InlineEdit claim={claim} onSave={onUpdate} />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={claim.status} />
            <span className="text-xs text-ink-50 font-mono">{claim.claimKey}</span>
          </div>
        </div>
        <button
          ref={correctButtonRef}
          onClick={() => setCorrecting(true)}
          className="shrink-0 px-3 py-1.5 text-xs font-medium text-ink-72 border border-rule"
          aria-label={`Report this claim as wrong: ${claim.statement.slice(0, 40)}`}
        >
          This is wrong
        </button>
      </div>

      {conflicts.length > 1 && <ConflictWarning claims={conflicts} />}

      <EvidenceDrawer
        claim={claim}
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen(!drawerOpen)}
      />

      {correcting && (
        <CorrectionModal
          claim={claim}
          onClose={() => setCorrecting(false)}
          onSubmit={onCorrect}
          triggerRef={correctButtonRef}
        />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/claims");
      if (!res.ok) throw new Error("Failed to fetch claims");
      const data = await res.json();
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadClaims() {
      try {
        const res = await fetch("/api/claims");
        if (!res.ok) throw new Error("Failed to fetch claims");
        const data = await res.json();
        setClaims(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load claims");
      } finally {
        setLoading(false);
      }
    }
    loadClaims();
  }, []);

  const handleUpdate = async (id: string, newStatement: string) => {
    const claim = claims.find((c) => c.id === id);
    if (!claim) return;
    // Statement changes go through the /correct endpoint to maintain
    // the correction audit trail and create negative assertions.
    const res = await fetch(`/api/claims/${id}/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previousValue: claim.statement,
        correctedValue: newStatement,
        source: "user-ui",
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || "Failed to update claim");
    }
    await fetchClaims();
  };

  const handleCorrect = async (claimId: string, previousValue: string, correctedValue: string) => {
    const res = await fetch(`/api/claims/${claimId}/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previousValue, correctedValue, source: "user-ui" }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || "Failed to submit correction");
    }
    await fetchClaims();
  };

  // Group non-superseded claims by claimKey to detect conflicts
  const claimsByKey: Record<string, Claim[]> = {};
  for (const claim of claims) {
    if (claim.status === "superseded") continue;
    if (!claimsByKey[claim.claimKey]) {
      claimsByKey[claim.claimKey] = [];
    }
    claimsByKey[claim.claimKey].push(claim);
  }

  // Group active (non-superseded) claims by category
  const claimsByCategory: Record<Category, Claim[]> = {
    numeric: [],
    date: [],
    attribution: [],
    capability: [],
    narrative: [],
  };

  for (const claim of claims) {
    if (claim.status !== "superseded") {
      const cat = claim.category as Category;
      if (claimsByCategory[cat]) {
        claimsByCategory[cat].push(claim);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-50" role="status" aria-label="Loading claims">Loading claims...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav title="Claims Ledger" />
        <main className="max-w-[720px] mx-auto px-6 py-8">
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            <strong>Error:</strong> {error}
          </div>
        </main>
      </div>
    );
  }

  const activeClaims = claims.filter((c) => c.status !== "superseded");
  const hasConflicts = Object.values(claimsByKey).some(
    (group) => group.length > 1
  );

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Claims Ledger" subtitle="Canonical facts that control what generation is allowed to say" />

      <main className="max-w-[720px] mx-auto px-6 py-8 space-y-6">
        {/* Summary bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-ink-72">
            <span className="font-medium">{activeClaims.length}</span> active claim{activeClaims.length !== 1 ? "s" : ""}
          </p>
          {hasConflicts && (
            <div className="flex items-center gap-1 text-ink-72 text-sm" role="alert" aria-label="Claims have conflicts">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="font-medium">Conflicts detected</span> - some claims share a key with different statements
            </div>
          )}
        </div>

        {/* Empty state */}
        {claims.length === 0 && (
          <div className="border-t border-rule pt-s-4 text-center">
            <svg className="w-12 h-12 text-ink-35 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-lg font-medium text-ink mb-2">No claims yet</h2>
            <p className="text-sm text-ink-50 mb-4">
              Claims are canonical facts extracted from your profile and experience data.
              Run the seed script to import existing data into the claims ledger.
            </p>
            <code className="text-sm px-3 py-1.5 text-ink-72">
              npm run seed:claims
            </code>
          </div>
        )}

        {/* Claims grouped by category */}
        {claims.length > 0 && CATEGORIES.map((category) => {
          const categoryClaims = claimsByCategory[category];
          if (categoryClaims.length === 0) return null;

          return (
            <section key={category} aria-label={`${CATEGORY_LABELS[category]} claims`}>
              <h2 className="text-lg font-medium text-ink mb-3 flex items-center gap-2">
                {CATEGORY_LABELS[category]}
                <span className="text-sm font-normal text-ink-50">({categoryClaims.length})</span>
              </h2>
              <div className="space-y-3">
                {categoryClaims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    conflicts={claimsByKey[claim.claimKey] || []}
                    onUpdate={handleUpdate}
                    onCorrect={handleCorrect}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
