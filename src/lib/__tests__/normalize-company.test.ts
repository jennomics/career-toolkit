import { describe, it, expect } from "vitest";
import { normalizeCompanyName } from "../normalize-company";

describe("normalizeCompanyName", () => {
  it("strips ', Inc.' suffix", () => {
    const result = normalizeCompanyName("Google, Inc.");
    expect(result.displayName).toBe("Google");
    expect(result.normalizedName).toBe("google");
  });

  it("strips ', LLC' suffix", () => {
    const result = normalizeCompanyName("Acme Solutions, LLC");
    expect(result.displayName).toBe("Acme Solutions");
    expect(result.normalizedName).toBe("acme solutions");
  });

  it("strips ' Corporation' suffix", () => {
    const result = normalizeCompanyName("Microsoft Corporation");
    expect(result.displayName).toBe("Microsoft");
    expect(result.normalizedName).toBe("microsoft");
  });

  it("strips ' Corp.' suffix", () => {
    const result = normalizeCompanyName("Apple Corp.");
    expect(result.displayName).toBe("Apple");
    expect(result.normalizedName).toBe("apple");
  });

  it("strips ', Ltd.' suffix", () => {
    const result = normalizeCompanyName("DeepMind, Ltd.");
    expect(result.displayName).toBe("DeepMind");
    expect(result.normalizedName).toBe("deepmind");
  });

  it("strips ' Company' suffix", () => {
    const result = normalizeCompanyName("Ford Motor Company");
    expect(result.displayName).toBe("Ford Motor");
    expect(result.normalizedName).toBe("ford motor");
  });

  it("preserves original casing in displayName", () => {
    const result = normalizeCompanyName("McKinsey & Company");
    expect(result.displayName).toBe("McKinsey &");
    // normalizedName is lowercase
    expect(result.normalizedName).toBe("mckinsey &");
  });

  it("returns lowercase normalizedName", () => {
    const result = normalizeCompanyName("OpenAI, Inc.");
    expect(result.normalizedName).toBe("openai");
  });

  it("passes through already-clean names unchanged", () => {
    const result = normalizeCompanyName("Stripe");
    expect(result.displayName).toBe("Stripe");
    expect(result.normalizedName).toBe("stripe");
  });

  it("handles empty string", () => {
    const result = normalizeCompanyName("");
    expect(result.displayName).toBe("");
    expect(result.normalizedName).toBe("");
  });

  it("handles whitespace-only input", () => {
    const result = normalizeCompanyName("   ");
    expect(result.displayName).toBe("");
    expect(result.normalizedName).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    const result = normalizeCompanyName("  Google, Inc.  ");
    expect(result.displayName).toBe("Google");
    expect(result.normalizedName).toBe("google");
  });

  it("matches suffixes case-insensitively", () => {
    const result = normalizeCompanyName("Some Company, INC.");
    expect(result.displayName).toBe("Some Company");
  });
});
