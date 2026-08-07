"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";

interface Contact {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  notes: string | null;
}

interface JobContact {
  id: string;
  relationship: string;
  contact: Contact;
}

interface ContactsTabProps {
  jobId: string;
}

const RELATIONSHIPS = ["recruiter", "hiring-manager", "referral", "interviewer", "peer", "other"];

export default function ContactsTab({ jobId }: ContactsTabProps) {
  const [jobContacts, setJobContacts] = useState<JobContact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"new" | "link">("new");
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    company: "",
    email: "",
    phone: "",
    linkedIn: "",
    notes: "",
    relationship: "recruiter",
    contactId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchJobContacts = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/tracker/job-contacts?jobId=${jobId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to load contacts"));
        return;
      }
      setJobContacts(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const fetchAllContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/tracker/contacts");
      if (res.ok) {
        setAllContacts(await res.json());
      }
    } catch {
      // Non-critical - ignore
    }
  }, []);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchJobContacts();
      fetchAllContacts();
    }
  }, [fetchJobContacts, fetchAllContacts]);

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const contactRes = await fetch("/api/tracker/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role || null,
          company: formData.company || null,
          email: formData.email || null,
          phone: formData.phone || null,
          linkedIn: formData.linkedIn || null,
          notes: formData.notes || null,
        }),
      });
      if (!contactRes.ok) {
        const errData = await contactRes.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to create contact"));
        return;
      }
      const newContact = await contactRes.json();

      const linkRes = await fetch("/api/tracker/job-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          contactId: newContact.id,
          relationship: formData.relationship,
        }),
      });
      if (!linkRes.ok) {
        const errData = await linkRes.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to link contact"));
        return;
      }

      resetForm();
      fetchJobContacts();
      fetchAllContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tracker/job-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          contactId: formData.contactId,
          relationship: formData.relationship,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to link contact"));
        return;
      }
      resetForm();
      fetchJobContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link contact");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      name: "",
      role: "",
      company: "",
      email: "",
      phone: "",
      linkedIn: "",
      notes: "",
      relationship: "recruiter",
      contactId: "",
    });
  };

  if (loading) {
    return <p className="text-center text-ink-35 py-s-4 text-body">Loading contacts...</p>;
  }

  const linkedIds = new Set(jobContacts.map((jc) => jc.contact.id));
  const availableContacts = allContacts.filter((c) => !linkedIds.has(c.id));

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-t border-rule p-s-2 text-live text-body" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-mono text-meta uppercase tracking-widest text-ink-50">
          Contacts ({jobContacts.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-ink underline min-h-[var(--target-min)] inline-flex items-center cursor-pointer"
        >
          {showForm ? "Cancel" : "Add contact"}
        </button>
      </div>

      {showForm && (
        <div className="border-t border-rule pt-s-2 space-y-3">
          {/* Toggle new vs link */}
          <div className="flex gap-s-2 mb-s-2" role="tablist" aria-label="Add contact mode">
            <button
              role="tab"
              aria-selected={formMode === "new"}
              onClick={() => setFormMode("new")}
              className={`font-mono text-meta cursor-pointer min-h-[var(--target-min)] inline-flex items-center px-s-2 ${
                formMode === "new" ? "border-b-2 border-ink text-ink" : "text-ink-50"
              }`}
            >
              New contact
            </button>
            <button
              role="tab"
              aria-selected={formMode === "link"}
              onClick={() => setFormMode("link")}
              className={`font-mono text-meta cursor-pointer min-h-[var(--target-min)] inline-flex items-center px-s-2 ${
                formMode === "link" ? "border-b-2 border-ink text-ink" : "text-ink-50"
              }`}
            >
              Link existing
            </button>
          </div>

          {formMode === "new" ? (
            <form onSubmit={handleSubmitNew} className="space-y-3">
              <div>
                <label htmlFor="contactName" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                  Name
                </label>
                <input
                  id="contactName"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-s-3">
                <div>
                  <label htmlFor="contactRole" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                    Role
                  </label>
                  <input
                    id="contactRole"
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="contactCompany" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                    Company
                  </label>
                  <input
                    id="contactCompany"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contactEmail" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                  Email
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink placeholder:text-ink-35 focus:border-b-2 focus:border-ink focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="contactRelationship" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                  Relationship
                </label>
                <select
                  id="contactRelationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1).replace("-", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add contact"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLinkExisting} className="space-y-3">
              <div>
                <label htmlFor="existingContact" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                  Select contact
                </label>
                <select
                  id="existingContact"
                  required
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
                >
                  <option value="">Choose...</option>
                  {availableContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="linkRelationship" className="text-meta font-mono uppercase tracking-widest text-ink-50 mb-s-1 block">
                  Relationship
                </label>
                <select
                  id="linkRelationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full border-0 border-b border-rule bg-transparent py-s-1 text-body text-ink focus:border-b-2 focus:border-ink focus:outline-none"
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1).replace("-", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting || !formData.contactId}
                className="border-[1.5px] border-live text-live bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Linking..." : "Link contact"}
              </button>
            </form>
          )}
        </div>
      )}

      {jobContacts.length === 0 && !showForm ? (
        <div className="text-center py-s-4">
          <p className="text-body text-ink-35">No contacts linked to this job yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {jobContacts.map((jc) => (
            <div key={jc.id} className="border-t border-rule py-s-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body font-medium text-ink">{jc.contact.name}</p>
                  {jc.contact.role && (
                    <p className="text-list text-ink-72">{jc.contact.role}</p>
                  )}
                  {jc.contact.company && (
                    <p className="text-list text-ink-50">{jc.contact.company}</p>
                  )}
                </div>
                <span className="font-mono text-meta text-ink-50 capitalize">
                  {jc.relationship.replace("-", " ")}
                </span>
              </div>
              <div className="flex gap-s-3 mt-1">
                {jc.contact.email && (
                  <a
                    href={`mailto:${jc.contact.email}`}
                    className="text-ink underline text-list min-h-[var(--target-min)] inline-flex items-center"
                  >
                    Email
                  </a>
                )}
                {jc.contact.linkedIn && (
                  <a
                    href={jc.contact.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline text-list min-h-[var(--target-min)] inline-flex items-center"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
