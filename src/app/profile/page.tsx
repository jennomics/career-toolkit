"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { extractErrorMessage } from "@/lib/extract-error-message";
import CollapsibleSection from "@/components/CollapsibleSection";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StringListEditor from "@/components/profile/StringListEditor";
import TextFieldEditor from "@/components/profile/TextFieldEditor";
import CareerRolesSection from "@/components/profile/CareerRolesSection";
import SignatureStoriesSection from "@/components/profile/SignatureStoriesSection";
import MetricsSection from "@/components/profile/MetricsSection";
import UnresolvedItemsSection from "@/components/profile/UnresolvedItemsSection";
import WritingSamplesSection from "@/components/profile/WritingSamplesSection";

interface Profile {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  currentTitle: string | null;
  reportsTo: string | null;
  positioningStatements: string[];
  selfDescribedStrengths: string[];
  technicalInventory: string | null;
  educationCredentials: string | null;
  recognitionPresence: string | null;
  operatingPrinciples: string[];
  writingStyle: string | null;
  selfDescribedPosture: string | null;
  searchTargetLevel: string | null;
  searchGeography: string | null;
  searchCompanies: string[];
  searchFirms: string[];
  resumeOperatingRules: string[];
  knownGaps: string | null;
  personalBackground: string | null;
  careerRoles: Array<{
    id: string;
    period: string;
    organization: string;
    title: string;
    scope: string | null;
    highlights: string[];
    sortOrder: number;
  }>;
  signatureStories: Array<{
    id: string;
    title: string;
    situation: string;
    obstacle: string;
    action: string;
    result: string;
    whyItMatters: string;
  }>;
  profileMetrics: Array<{
    id: string;
    label: string;
    value: string;
    source: string | null;
  }>;
  unresolvedItems: Array<{
    id: string;
    section: string;
    description: string;
    optionA: string;
    optionB: string;
    resolution: string | null;
    resolvedAt: string | null;
    priority: string;
  }>;
  writingSamples: Array<{
    id: string;
    title: string;
    content: string;
    context: string | null;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const updateProfile = async (updates: Record<string, unknown>) => {
    if (!profile) return;
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    const updated = await res.json();
    setProfile(updated);
  };

  const resolveItem = async (id: string, resolution: string) => {
    const res = await fetch("/api/profile/unresolved", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolution }),
    });
    if (!res.ok) throw new Error("Failed to resolve item");
    await fetchProfile();
  };

  const addWritingSample = async (sample: {
    title: string;
    content: string;
    context?: string;
  }) => {
    const res = await fetch("/api/profile/writing-samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(extractErrorMessage(data, "Failed to add writing sample"));
    }
    await fetchProfile();
  };

  const deleteWritingSample = async (id: string) => {
    const res = await fetch(`/api/profile/writing-samples?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete writing sample");
    await fetchProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">
              Candidate Profile
            </h1>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Candidate Profile
            </h1>
            <nav aria-label="Main navigation" className="flex gap-4">
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/jobs"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Jobs
              </Link>
              <Link
                href="/experience"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Experience
              </Link>
              <Link
                href="/resume"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Resume
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">
              No profile found. Run the seed script to populate your profile data.
            </p>
            <code className="text-sm bg-gray-100 px-3 py-1.5 rounded-md text-gray-700">
              npm run seed:profile
            </code>
          </div>
        </main>
      </div>
    );
  }

  const unresolvedCount = profile.unresolvedItems.filter(
    (i) => !i.resolution
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Candidate Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Everything a resume writer needs to know
            </p>
          </div>
          <nav aria-label="Main navigation" className="flex gap-4">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/jobs"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Jobs
            </Link>
            <Link
              href="/experience"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Experience
            </Link>
            <Link
              href="/resume"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Resume
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {/* Unresolved items warning banner */}
        {unresolvedCount > 0 && (
          <div
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3"
            role="alert"
          >
            <svg
              className="w-5 h-5 text-amber-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm font-medium text-amber-800">
              {unresolvedCount} unresolved item{unresolvedCount !== 1 ? "s" : ""}{" "}
              need your decision before resume generation can proceed.
            </p>
          </div>
        )}

        {/* Contact / Header */}
        <CollapsibleSection title="Contact & Identity" defaultOpen>
          <ProfileHeader
            profile={profile}
            onSave={async (data) => updateProfile(data)}
          />
        </CollapsibleSection>

        {/* Positioning Statements */}
        <CollapsibleSection
          title="Positioning Statements"
          badge={profile.positioningStatements.length}
          defaultOpen
        >
          <StringListEditor
            items={profile.positioningStatements}
            onSave={async (items) =>
              updateProfile({ positioningStatements: items })
            }
            placeholder="Add positioning statement..."
            emptyMessage="No positioning statements yet."
          />
        </CollapsibleSection>

        {/* Career Roles */}
        <CollapsibleSection
          title="Career Roles"
          badge={profile.careerRoles.length}
        >
          <CareerRolesSection roles={profile.careerRoles} />
        </CollapsibleSection>

        {/* Signature Stories */}
        <CollapsibleSection
          title="Signature Stories"
          badge={profile.signatureStories.length}
        >
          <SignatureStoriesSection stories={profile.signatureStories} />
        </CollapsibleSection>

        {/* Metrics */}
        <CollapsibleSection
          title="Metrics & Evidence"
          badge={profile.profileMetrics.length}
        >
          <MetricsSection metrics={profile.profileMetrics} />
        </CollapsibleSection>

        {/* Self-Described Strengths */}
        <CollapsibleSection
          title="Self-Described Strengths"
          badge={profile.selfDescribedStrengths.length}
        >
          <StringListEditor
            items={profile.selfDescribedStrengths}
            onSave={async (items) =>
              updateProfile({ selfDescribedStrengths: items })
            }
            placeholder="Add strength..."
            emptyMessage="No strengths listed yet."
          />
        </CollapsibleSection>

        {/* Operating Principles */}
        <CollapsibleSection
          title="Operating Principles"
          badge={profile.operatingPrinciples.length}
        >
          <StringListEditor
            items={profile.operatingPrinciples}
            onSave={async (items) =>
              updateProfile({ operatingPrinciples: items })
            }
            placeholder="Add principle..."
            emptyMessage="No operating principles yet."
          />
        </CollapsibleSection>

        {/* Resume Operating Rules */}
        <CollapsibleSection
          title="Resume Operating Rules"
          badge={profile.resumeOperatingRules.length}
        >
          <StringListEditor
            items={profile.resumeOperatingRules}
            onSave={async (items) =>
              updateProfile({ resumeOperatingRules: items })
            }
            placeholder="Add rule..."
            emptyMessage="No resume operating rules yet."
          />
        </CollapsibleSection>

        {/* Technical Inventory */}
        <CollapsibleSection title="Technical Inventory">
          <TextFieldEditor
            value={profile.technicalInventory}
            onSave={async (value) =>
              updateProfile({ technicalInventory: value })
            }
            label="Technical Inventory"
            multiline
          />
        </CollapsibleSection>

        {/* Education & Credentials */}
        <CollapsibleSection title="Education & Credentials">
          <TextFieldEditor
            value={profile.educationCredentials}
            onSave={async (value) =>
              updateProfile({ educationCredentials: value })
            }
            label="Education & Credentials"
            multiline
          />
        </CollapsibleSection>

        {/* Recognition & Presence */}
        <CollapsibleSection title="Recognition & Presence">
          <TextFieldEditor
            value={profile.recognitionPresence}
            onSave={async (value) =>
              updateProfile({ recognitionPresence: value })
            }
            label="Recognition & Presence"
            multiline
          />
        </CollapsibleSection>

        {/* Writing Style */}
        <CollapsibleSection title="Writing & Communication Style">
          <div className="space-y-4">
            <TextFieldEditor
              value={profile.writingStyle}
              onSave={async (value) => updateProfile({ writingStyle: value })}
              label="Writing Style"
              multiline
            />
            <TextFieldEditor
              value={profile.selfDescribedPosture}
              onSave={async (value) =>
                updateProfile({ selfDescribedPosture: value })
              }
              label="Self-Described Posture"
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Search Parameters */}
        <CollapsibleSection title="Search Parameters">
          <div className="space-y-4">
            <TextFieldEditor
              value={profile.searchTargetLevel}
              onSave={async (value) =>
                updateProfile({ searchTargetLevel: value })
              }
              label="Target Level"
            />
            <TextFieldEditor
              value={profile.searchGeography}
              onSave={async (value) =>
                updateProfile({ searchGeography: value })
              }
              label="Geography"
            />
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Target Companies
              </p>
              <StringListEditor
                items={profile.searchCompanies}
                onSave={async (items) =>
                  updateProfile({ searchCompanies: items })
                }
                placeholder="Add company..."
                emptyMessage="No target companies."
              />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Search Firms
              </p>
              <StringListEditor
                items={profile.searchFirms}
                onSave={async (items) =>
                  updateProfile({ searchFirms: items })
                }
                placeholder="Add search firm..."
                emptyMessage="No search firms."
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Known Gaps */}
        <CollapsibleSection title="Known Gaps">
          <TextFieldEditor
            value={profile.knownGaps}
            onSave={async (value) => updateProfile({ knownGaps: value })}
            label="Known Gaps"
            multiline
          />
        </CollapsibleSection>

        {/* Personal Background */}
        <CollapsibleSection title="Personal Background">
          <TextFieldEditor
            value={profile.personalBackground}
            onSave={async (value) =>
              updateProfile({ personalBackground: value })
            }
            label="Personal Background"
            multiline
          />
        </CollapsibleSection>

        {/* Unresolved Items */}
        <CollapsibleSection
          title="Unresolved Items"
          badge={unresolvedCount > 0 ? unresolvedCount : undefined}
          defaultOpen={unresolvedCount > 0}
        >
          <UnresolvedItemsSection
            items={profile.unresolvedItems}
            onResolve={resolveItem}
          />
        </CollapsibleSection>

        {/* Writing Samples */}
        <CollapsibleSection
          title="Writing Samples"
          badge={profile.writingSamples.length}
        >
          <WritingSamplesSection
            samples={profile.writingSamples}
            onAdd={addWritingSample}
            onDelete={deleteWritingSample}
          />
        </CollapsibleSection>
      </main>
    </div>
  );
}
