"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { extractErrorMessage } from "@/lib/extract-error-message";
import Nav from "@/components/Nav";

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
        setError(extractErrorMessage(errData, `Failed to load taxonomy (${res.status})`));
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
        setError(extractErrorMessage(errData, "Failed to normalize skills"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to normalize");
    } finally {
      setNormalizing(false);
    }
  };

  const handleForceNormalize = async () => {
    setNormalizing(true);
    setNormalizeResult(null);
    try {
      const res = await fetch("/api/skills/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setNormalizeResult(data);
        await fetchTaxonomy();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(extractErrorMessage(errData, "Failed to normalize skills"));
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
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const toggleSubcategory = (key: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const getCategoryTotals = (cat: TaxonomyCategory) => {
    let jobs = 0; let exp = 0;
    for (const sub of cat.subcategories) { for (const skill of sub.skills) { jobs += skill.jobCount; exp += skill.experienceCount; } }
    return { jobs, exp };
  };

  const getSubcategoryTotals = (sub: TaxonomySubcategory) => {
    let jobs = 0; let exp = 0;
    for (const skill of sub.skills) { jobs += skill.jobCount; exp += skill.experienceCount; }
    return { jobs, exp };
  };

  return (
    <div className="min-h-screen bg-paper">
      <Nav title="Skills Taxonomy" subtitle="Browse and normalize your skills across jobs and experience" />

      <main className="max-w-[720px] mx-auto px-6 py-s-4 space-y-s-4">
        {/* Error display */}
        {error && (
          <div className="border border-rule p-s-3 text-ink text-body" role="alert">
            {error}
          </div>
        )}

        {/* Stats and Normalize button */}
        {taxonomy && (
          <div className="border-t border-rule pt-s-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-s-4">
                <div>
                  <p className="font-mono text-h3 text-ink">{taxonomy.stats.totalJobSkills}</p>
                  <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Job skills</p>
                </div>
                <div>
                  <p className="font-mono text-h3 text-ink">{taxonomy.stats.totalExperienceSkills}</p>
                  <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Experience skills</p>
                </div>
                <div>
                  <p className="font-mono text-h3 text-ink">{taxonomy.stats.taxonomySkillCount}</p>
                  <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Taxonomy skills</p>
                </div>
                <div>
                  <p className="font-mono text-h3 text-ink">{taxonomy.unmapped.length}</p>
                  <p className="font-mono text-meta text-ink-50 uppercase tracking-widest">Unmapped</p>
                </div>
              </div>
              <div className="flex gap-s-2">
                <button
                  onClick={handleNormalize}
                  disabled={normalizing}
                  className="px-s-3 h-[48px] border-[1.5px] border-live text-live text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {normalizing ? "Normalizing..." : "Normalize new skills"}
                </button>
                <button
                  onClick={handleForceNormalize}
                  disabled={normalizing}
                  className="px-s-3 h-[48px] border border-ink text-ink text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  title="Re-process all skills against the latest taxonomy (use after taxonomy updates)"
                >
                  {normalizing ? "..." : "Re-normalize all"}
                </button>
              </div>
            </div>

            {/* Normalize result */}
            {normalizeResult && (
              <div className="mt-s-3 border border-rule p-s-3 text-body">
                {normalizeResult.totalProcessed === 0 ? (
                  <>
                    <p className="text-ink font-medium">All skills already normalized</p>
                    <p className="text-ink-72 mt-1">
                      Skills are automatically categorized when jobs are saved. Use &quot;Re-normalize All&quot; to re-process against the latest taxonomy.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-ink font-medium">Normalization complete</p>
                    <p className="text-ink-72 mt-1">
                      Processed {normalizeResult.totalProcessed} skills:
                      {" "}{normalizeResult.normalized} names normalized,
                      {" "}{normalizeResult.categorized} categorized
                      {normalizeResult.unmapped.length > 0 && (
                        <>, {normalizeResult.unmapped.length} unmapped</>
                      )}.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <p className="text-center text-ink-35 py-s-5">Loading taxonomy...</p>
        )}

        {/* Taxonomy tree */}
        {taxonomy && (
          <div className="divide-y divide-rule border-t border-rule">
            {taxonomy.categories.map((category) => {
              const catTotals = getCategoryTotals(category);
              const isExpanded = expandedCategories.has(category.name);

              return (
                <div key={category.name}>
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full py-s-3 flex items-center justify-between cursor-pointer min-h-[44px]"
                  >
                    <div className="flex items-center gap-s-2">
                      <span className="text-body text-ink-35">{isExpanded ? "v" : ">"}</span>
                      <h2 className="text-body font-medium text-ink">{category.name}</h2>
                      <span className="font-mono text-meta text-ink-50 uppercase tracking-widest">
                        {category.type === "hard" ? "TECHNICAL" : "INTERPERSONAL"}
                      </span>
                    </div>
                    <div className="flex gap-s-3 font-mono text-meta text-ink-50">
                      {catTotals.jobs > 0 && <span>{catTotals.jobs} job mentions</span>}
                      {catTotals.exp > 0 && <span>{catTotals.exp} experience mentions</span>}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="pl-s-3 pb-s-3">
                      {category.subcategories.map((subcategory) => {
                        const subKey = `${category.name}:${subcategory.name}`;
                        const subTotals = getSubcategoryTotals(subcategory);
                        const subExpanded = expandedSubcategories.has(subKey);

                        return (
                          <div key={subKey} className="mt-s-2">
                            <button
                              onClick={() => toggleSubcategory(subKey)}
                              className="w-full flex items-center justify-between py-s-1 cursor-pointer min-h-[44px]"
                            >
                              <div className="flex items-center gap-s-1">
                                <span className="text-meta text-ink-35">{subExpanded ? "v" : ">"}</span>
                                <h3 className="text-body text-ink-72">{subcategory.name}</h3>
                                <span className="font-mono text-meta text-ink-35">({subcategory.skills.length} skills)</span>
                              </div>
                              <div className="flex gap-s-2 font-mono text-meta text-ink-35">
                                {subTotals.jobs > 0 && <span>{subTotals.jobs} jobs</span>}
                                {subTotals.exp > 0 && <span>{subTotals.exp} exp</span>}
                              </div>
                            </button>

                            {subExpanded && (
                              <div className="ml-s-3 mt-s-1 divide-y divide-rule">
                                {subcategory.skills.map((skill) => (
                                  <div
                                    key={skill.canonicalName}
                                    className="flex items-center justify-between py-s-1"
                                  >
                                    <div className="flex items-center gap-s-1">
                                      <span className="text-body text-ink">{skill.canonicalName}</span>
                                      {skill.aliases.length > 0 && (
                                        <span className="font-mono text-meta text-ink-35 truncate max-w-xs" title={skill.aliases.join(", ")}>
                                          ({skill.aliases.slice(0, 3).join(", ")}{skill.aliases.length > 3 ? "..." : ""})
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-s-2">
                                      {skill.jobCount > 0 && (
                                        <span className="font-mono text-meta text-ink-50">
                                          {skill.jobCount} jobs
                                        </span>
                                      )}
                                      {skill.experienceCount > 0 && (
                                        <span className="font-mono text-meta text-ink-50">
                                          {skill.experienceCount} exp
                                        </span>
                                      )}
                                      {skill.jobCount === 0 && skill.experienceCount === 0 && (
                                        <span className="font-mono text-meta text-ink-35">--</span>
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
          <section className="border-t border-rule pt-s-3">
            <h2 className="text-h3 font-zen font-medium text-ink mb-s-2">
              Unmapped skills (<span className="font-mono">{taxonomy.unmapped.length}</span>)
            </h2>
            <p className="text-body text-ink-50 mb-s-3">
              These skills were found in your data but are not yet in the taxonomy.
            </p>
            <div className="divide-y divide-rule border-t border-rule">
              {taxonomy.unmapped.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between py-s-1"
                >
                  <span className="text-body text-ink">{skill.name}</span>
                  <div className="flex gap-s-2 font-mono text-meta text-ink-50">
                    {skill.jobCount > 0 && <span>{skill.jobCount}j</span>}
                    {skill.experienceCount > 0 && <span>{skill.experienceCount}e</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
