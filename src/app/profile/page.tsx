"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import CollapsibleSection from "@/components/CollapsibleSection";
import {
  IdentitySection,
  PositioningSection,
  CareerTimelineSection,
  StoriesSection,
  MetricsSection,
  TextAreaSection,
  SearchParametersSection,
  UnresolvedItemsSection,
  WritingSamplesSection,
  ArrayEditor,
} from "@/components/profile";
import type { Profile } from "@/components/profile";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasFetched = useRef(false);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/profile");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed to load profile (${res.status})`
        );
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchProfile();
    }
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (updates: Partial<Profile>) => {
      setSaving(true);
      setError(null);
      try {
        const payload = profile
          ? { ...profile, ...updates, id: profile.id }
          : { name: updates.name || "New Profile", ...updates };
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save profile");
        }
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [profile]
  );

  const unresolvedCount = profile
    ? profile.unresolvedItems.filter((item) => !item.resolution).length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Candidate Profile
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your career profile, stories, and metrics
            </p>
          </div>
          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              &larr; Jobs
            </Link>
            <Link
              href="/phrases"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Phrases
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
            role="alert"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {saving && (
          <div
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm"
            role="status"
          >
            Saving...
          </div>
        )}

        {!profile && !loading && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No profile yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your profile to get started.
            </p>
            <button
              onClick={() => saveProfile({ name: "New Profile" })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2 cursor-pointer"
            >
              Create Profile
            </button>
          </div>
        )}

        {profile && (
          <>
            {unresolvedCount > 0 && (
              <div
                className="bg-amber-50 border border-amber-300 rounded-lg p-4"
                role="alert"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-amber-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span className="font-semibold text-amber-800">
                    {unresolvedCount} unresolved item
                    {unresolvedCount !== 1 ? "s" : ""} need attention
                  </span>
                </div>
              </div>
            )}

            <IdentitySection profile={profile} onSave={saveProfile} />
            <PositioningSection profile={profile} onSave={saveProfile} />
            <CareerTimelineSection profile={profile} onRefresh={fetchProfile} />
            <StoriesSection profile={profile} onRefresh={fetchProfile} />
            <MetricsSection profile={profile} onRefresh={fetchProfile} />

            <TextAreaSection
              title="Technical Inventory"
              value={profile.technicalInventory}
              fieldName="technicalInventory"
              onSave={(v) => saveProfile({ technicalInventory: v })}
            />

            <TextAreaSection
              title="Education & Credentials"
              value={profile.educationCredentials}
              fieldName="educationCredentials"
              onSave={(v) => saveProfile({ educationCredentials: v })}
            />

            <CollapsibleSection
              title="Operating Principles"
              badge={profile.operatingPrinciples.length}
            >
              <ArrayEditor
                label="Principles"
                items={profile.operatingPrinciples}
                onSave={(items) => saveProfile({ operatingPrinciples: items })}
              />
            </CollapsibleSection>

            <SearchParametersSection profile={profile} onSave={saveProfile} />

            <TextAreaSection
              title="Known Gaps"
              value={profile.knownGaps}
              fieldName="knownGaps"
              onSave={(v) => saveProfile({ knownGaps: v })}
            />

            <UnresolvedItemsSection
              profile={profile}
              onRefresh={fetchProfile}
            />

            <WritingSamplesSection
              profile={profile}
              onRefresh={fetchProfile}
            />

            <CollapsibleSection
              title="Resume Operating Rules"
              badge={profile.resumeOperatingRules.length}
            >
              <ArrayEditor
                label="Rules"
                items={profile.resumeOperatingRules}
                onSave={(items) =>
                  saveProfile({ resumeOperatingRules: items })
                }
              />
            </CollapsibleSection>
          </>
        )}
      </main>
    </div>
  );
}
