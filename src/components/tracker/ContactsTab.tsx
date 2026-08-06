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
      // Create contact first
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

      // Link to job
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
    return <p className="text-center text-gray-400 py-8">Loading contacts...</p>;
  }

  // Filter out already-linked contacts
  const linkedIds = new Set(jobContacts.map((jc) => jc.contact.id));
  const availableContacts = allContacts.filter((c) => !linkedIds.has(c.id));

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Contacts ({jobContacts.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {showForm ? "Cancel" : "+ Add Contact"}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {/* Toggle new vs link */}
          <div className="flex gap-2 mb-3" role="tablist" aria-label="Add contact mode">
            <button
              role="tab"
              aria-selected={formMode === "new"}
              onClick={() => setFormMode("new")}
              className={`text-xs font-medium px-3 py-1 rounded cursor-pointer ${
                formMode === "new" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              New Contact
            </button>
            <button
              role="tab"
              aria-selected={formMode === "link"}
              onClick={() => setFormMode("link")}
              className={`text-xs font-medium px-3 py-1 rounded cursor-pointer ${
                formMode === "link" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              Link Existing
            </button>
          </div>

          {formMode === "new" ? (
            <form onSubmit={handleSubmitNew} className="space-y-3">
              <div>
                <label htmlFor="contactName" className="block text-xs font-medium text-gray-600 mb-1">
                  Name *
                </label>
                <input
                  id="contactName"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="contactRole" className="block text-xs font-medium text-gray-600 mb-1">
                    Role
                  </label>
                  <input
                    id="contactRole"
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="contactCompany" className="block text-xs font-medium text-gray-600 mb-1">
                    Company
                  </label>
                  <input
                    id="contactCompany"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contactEmail" className="block text-xs font-medium text-gray-600 mb-1">
                  Email
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label htmlFor="contactRelationship" className="block text-xs font-medium text-gray-600 mb-1">
                  Relationship *
                </label>
                <select
                  id="contactRelationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
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
                className="w-full text-sm font-medium bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Adding..." : "Add Contact"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLinkExisting} className="space-y-3">
              <div>
                <label htmlFor="existingContact" className="block text-xs font-medium text-gray-600 mb-1">
                  Select Contact
                </label>
                <select
                  id="existingContact"
                  required
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
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
                <label htmlFor="linkRelationship" className="block text-xs font-medium text-gray-600 mb-1">
                  Relationship
                </label>
                <select
                  id="linkRelationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
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
                className="w-full text-sm font-medium bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Linking..." : "Link Contact"}
              </button>
            </form>
          )}
        </div>
      )}

      {jobContacts.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No contacts linked to this job yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobContacts.map((jc) => (
            <div key={jc.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{jc.contact.name}</p>
                  {jc.contact.role && (
                    <p className="text-xs text-gray-500">{jc.contact.role}</p>
                  )}
                  {jc.contact.company && (
                    <p className="text-xs text-gray-400">{jc.contact.company}</p>
                  )}
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">
                  {jc.relationship.replace("-", " ")}
                </span>
              </div>
              <div className="flex gap-3 mt-2">
                {jc.contact.email && (
                  <a
                    href={`mailto:${jc.contact.email}`}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Email
                  </a>
                )}
                {jc.contact.linkedIn && (
                  <a
                    href={jc.contact.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700"
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
