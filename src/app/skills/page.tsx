"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface TaxonomySkill {
  canonicalName: string;
  jobCount: number;
  experienceCount: number;
  aliases: string[];
}

interface TaxonomySubcategory {
  name: string;
  skills: TaxonomySkill[];
}

interface TaxonomyCategory {
  name: string;
  type: "hard" | "soft";
  subcategories: TaxonomySubcategory[];
}

interface UnmappedSkill {
  name: string;
  jobCount: number;
  experienceCount: number;
}

interface TaxonomyResponse {
  categories: TaxonomyCategory[];
  unmapped: UnmappedSkill[];
  stats: {
    totalJobSkills: number;
    totalExperienceSkills: number;
    taxonomySkillCount: number;
  };
}

interface NormalizeResult {
  totalProcessed: number;
  normalized: number;
  categorized: number;
  unmapped: string[];
}

export default function SkillsPage() {
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizeResult, setNormalizeResult] = useState<NormalizeResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const hasFetched = useRef(false);

  const fetchTaxonomy = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/skills/taxonomy");
      if (res.ok) {
        const data = await res.json();
        setTaxonomy(data);
        // Auto-expand categories that have counts
        const catsWithData = new Set<string>();
        for (const cat of data.categories) {
          for (const sub of cat.subcategories) {
            if (sub.skills.some((s: TaxonomySkill) => s.jobCount > 0 || s.experienceCount > 0)) {
              catsWithData.add(cat.name);
            }
          }
        }
        setExpandedCategories(catsWithData);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Failed to load taxonomy (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchTaxonomy();
    }
  }, [fetchTaxonomy]);

  const handleNormalize = async () => {
    setNormalizing(true);
    setNormalizeResult(null);
    try {
      const res = await fetch("/api/skills/normalize", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setNormalizeResult(data);
        // Refresh taxonomy data after normalization
        await fetchTaxonomy();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to normalize skills");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to normalize");
    } finally {
      setNormalizing(false);
    }
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleSubcategory = (key: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getCategoryTotals = (cat: TaxonomyCategory) => {
    let jobs = 0;
    let exp = 0;
    for (const sub of cat.subcategories) {
      for (const skill of sub.skills) {
        jobs += skill.jobCount;
        exp += skill.experienceCount;
      }
    }
    return { jobs, exp };
  };

  const getSubcategoryTotals = (sub: TaxonomySubcategory) => {
    let jobs = 0;
    let exp = 0;
    for (const skill of sub.skills) {
      jobs += skill.jobCount;
      exp += skill.experienceCount;
    }
    return { jobs, exp };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skills Taxonomy</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse and normalize your skills across jobs and experience
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              &larr; Jobs
            </Link>
            <Link
              href="/experience"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              My Experience &rarr;
            </Link>
            <Link
              href="/resume"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Resume Builder &rarr;
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats and Normalize button */}
        {taxonomy && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{taxonomy.stats.totalJobSkills}</p>
                  <p className="text-sm text-gray-500">Job Skills</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{taxonomy.stats.totalExperienceSkills}</p>
                  <p className="text-sm text-gray-500">Experience Skills</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{taxonomy.stats.taxonomySkillCount}</p>
                  <p className="text-sm text-gray-500">Taxonomy Skills</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{taxonomy.unmapped.length}</p>
                  <p className="text-sm text-gray-500">Unmapped</p>
                </div>
              </div>
              <button
                onClick={handleNormalize}
                disabled={normalizing}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {normalizing ? "Normalizing..." : "Normalize Skills"}
              </button>
            </div>

            {/* Normalize result */}
            {normalizeResult && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-green-800">Normalization complete!</p>
                <p className="text-green-700 mt-1">
                  Processed {normalizeResult.totalProcessed} skills:
                  {" "}{normalizeResult.normalized} names normalized,
                  {" "}{normalizeResult.categorized} categorized,
                  {" "}{normalizeResult.unmapped.length} unmapped.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <p className="text-center text-gray-400 py-12">Loading taxonomy...</p>
        )}

        {/* Taxonomy tree */}
        {taxonomy && (
          <div className="space-y-4">
            {taxonomy.categories.map((category) => {
              const catTotals = getCategoryTotals(category);
              const isExpanded = expandedCategories.has(category.name);

              return (
                <div key={category.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                      <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        category.type === "hard"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {category.type === "hard" ? "Technical" : "Interpersonal"}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-500">
                      {catTotals.jobs > 0 && (
                        <span>{catTotals.jobs} job mentions</span>
                      )}
                      {catTotals.exp > 0 && (
                        <span>{catTotals.exp} experience mentions</span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-6 pb-4">
                      {category.subcategories.map((subcategory) => {
                        const subKey = `${category.name}:${subcategory.name}`;
                        const subTotals = getSubcategoryTotals(subcategory);
                        const subExpanded = expandedSubcategories.has(subKey);

                        return (
                          <div key={subKey} className="mt-3">
                            <button
                              onClick={() => toggleSubcategory(subKey)}
                              className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded cursor-pointer px-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">{subExpanded ? "▼" : "▶"}</span>
                                <h3 className="text-sm font-medium text-gray-700">{subcategory.name}</h3>
                                <span className="text-xs text-gray-400">({subcategory.skills.length} skills)</span>
                              </div>
                              <div className="flex gap-3 text-xs text-gray-400">
                                {subTotals.jobs > 0 && <span>{subTotals.jobs} jobs</span>}
                                {subTotals.exp > 0 && <span>{subTotals.exp} exp</span>}
                              </div>
                            </button>

                            {subExpanded && (
                              <div className="ml-6 mt-1 space-y-1">
                                {subcategory.skills.map((skill) => (
                                  <div
                                    key={skill.canonicalName}
                                    className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-gray-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-800">{skill.canonicalName}</span>
                                      {skill.aliases.length > 0 && (
                                        <span className="text-xs text-gray-400 truncate max-w-xs" title={skill.aliases.join(", ")}>
                                          ({skill.aliases.slice(0, 3).join(", ")}{skill.aliases.length > 3 ? "..." : ""})
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-3">
                                      {skill.jobCount > 0 && (
                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                          {skill.jobCount} jobs
                                        </span>
                                      )}
                                      {skill.experienceCount > 0 && (
                                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                          {skill.experienceCount} exp
                                        </span>
                                      )}
                                      {skill.jobCount === 0 && skill.experienceCount === 0 && (
                                        <span className="text-xs text-gray-300">--</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unmapped skills */}
        {taxonomy && taxonomy.unmapped.length > 0 && (
          <div className="bg-white rounded-lg border border-orange-200 overflow-hidden">
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
              <h2 className="text-lg font-semibold text-orange-800">
                Unmapped Skills ({taxonomy.unmapped.length})
              </h2>
              <p className="text-sm text-orange-600 mt-1">
                These skills were found in your data but are not yet in the taxonomy.
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {taxonomy.unmapped.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between py-1.5 px-3 rounded bg-gray-50"
                  >
                    <span className="text-sm text-gray-700 truncate">{skill.name}</span>
                    <div className="flex gap-2 shrink-0">
                      {skill.jobCount > 0 && (
                        <span className="text-xs text-blue-600">{skill.jobCount}j</span>
                      )}
                      {skill.experienceCount > 0 && (
                        <span className="text-xs text-green-600">{skill.experienceCount}e</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
