import { describe, it, expect } from "vitest";
import {
  normalizeSkillName,
  categorizeSkill,
  normalizeAndCategorize,
  getAllCanonicalNames,
  getAliases,
} from "../skill-taxonomy";

describe("normalizeSkillName", () => {
  it("maps 'reactjs' to 'React'", () => {
    expect(normalizeSkillName("reactjs")).toBe("React");
  });

  it("maps 'k8s' to 'Kubernetes'", () => {
    expect(normalizeSkillName("k8s")).toBe("Kubernetes");
  });

  it("maps 'py' to 'Python'", () => {
    expect(normalizeSkillName("py")).toBe("Python");
  });

  it("maps 'js' to 'JavaScript'", () => {
    expect(normalizeSkillName("js")).toBe("JavaScript");
  });

  it("maps 'ts' to 'TypeScript'", () => {
    expect(normalizeSkillName("ts")).toBe("TypeScript");
  });

  it("maps 'golang' to 'Go'", () => {
    expect(normalizeSkillName("golang")).toBe("Go");
  });

  it("is case-insensitive", () => {
    expect(normalizeSkillName("PYTHON")).toBe("Python");
    expect(normalizeSkillName("ReactJS")).toBe("React");
  });

  it("returns original string for unknown skills", () => {
    expect(normalizeSkillName("SomeUnknownFramework")).toBe("SomeUnknownFramework");
  });

  it("trims whitespace", () => {
    expect(normalizeSkillName("  python  ")).toBe("Python");
  });
});

describe("categorizeSkill", () => {
  it("returns correct category and subcategory for 'React'", () => {
    const result = categorizeSkill("React");
    expect(result).toEqual({ category: "Hard Skills", subcategory: "Frontend" });
  });

  it("returns correct category for 'Python'", () => {
    const result = categorizeSkill("Python");
    expect(result).toEqual({ category: "Hard Skills", subcategory: "Programming Languages" });
  });

  it("returns correct category for 'Leadership'", () => {
    const result = categorizeSkill("Leadership");
    expect(result).toEqual({ category: "Soft Skills", subcategory: "Leadership" });
  });

  it("returns correct category for aliases (lowercase input)", () => {
    const result = categorizeSkill("k8s");
    expect(result).toEqual({ category: "Hard Skills", subcategory: "Cloud & DevOps" });
  });

  it("returns null for unknown skills", () => {
    const result = categorizeSkill("SomeUnknownThing");
    expect(result).toBeNull();
  });
});

describe("normalizeAndCategorize", () => {
  it("normalizes and categorizes a known alias", () => {
    const result = normalizeAndCategorize("reactjs");
    expect(result.normalizedName).toBe("React");
    expect(result.category).toBe("Hard Skills > Frontend");
  });

  it("normalizes and categorizes 'k8s'", () => {
    const result = normalizeAndCategorize("k8s");
    expect(result.normalizedName).toBe("Kubernetes");
    expect(result.category).toBe("Hard Skills > Cloud & DevOps");
  });

  it("returns null category for unknown skills", () => {
    const result = normalizeAndCategorize("FooBarBaz");
    expect(result.normalizedName).toBe("FooBarBaz");
    expect(result.category).toBeNull();
  });
});

describe("getAllCanonicalNames", () => {
  it("returns an array of all canonical skill names", () => {
    const names = getAllCanonicalNames();
    expect(names).toContain("React");
    expect(names).toContain("Python");
    expect(names).toContain("Kubernetes");
    expect(names).toContain("Leadership");
    expect(names.length).toBeGreaterThan(50);
  });
});

describe("getAliases", () => {
  it("returns aliases for a known canonical name", () => {
    const aliases = getAliases("React");
    expect(aliases).toContain("react");
    expect(aliases).toContain("reactjs");
  });

  it("returns empty array for an unknown canonical name", () => {
    const aliases = getAliases("UnknownSkill");
    expect(aliases).toEqual([]);
  });
});
