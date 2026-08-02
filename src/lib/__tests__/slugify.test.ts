import { describe, it, expect } from "vitest";
import { slugify } from "../slugify";

describe("slugify", () => {
  it("converts 'Hello World' to 'hello-world'", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("lowercases all characters", () => {
    expect(slugify("FOO BAR")).toBe("foo-bar");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("foo bar baz")).toBe("foo-bar-baz");
  });

  it("removes special characters", () => {
    expect(slugify("Foo & Bar")).toBe("foo-bar");
    expect(slugify("Hello! World?")).toBe("hello-world");
    expect(slugify("one@two#three")).toBe("one-two-three");
  });

  it("deduplicates consecutive hyphens", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
    expect(slugify("  hello  ")).toBe("hello");
    expect(slugify("---foo---bar---")).toBe("foo-bar");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("preserves numbers", () => {
    expect(slugify("Version 2.0")).toBe("version-2-0");
  });

  it("handles complex real-world title", () => {
    expect(slugify("Senior Software Engineer (Remote) - Full Stack")).toBe(
      "senior-software-engineer-remote-full-stack"
    );
  });
});
