import { describe, it, expect } from "vitest";
import { parseSkills } from "../parse-skills";

describe("parseSkills", () => {
  it("extracts known technologies from a realistic job description", () => {
    const description = `
      We are looking for a Senior Software Engineer with experience in Python,
      JavaScript, and TypeScript. You will work with React on the frontend and
      Node.js on the backend. Experience with AWS, Docker, and Kubernetes is
      required. Familiarity with PostgreSQL and Redis is a plus.
    `;
    const skills = parseSkills(description);

    expect(skills).toContain("Python");
    expect(skills).toContain("JavaScript");
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("React");
    expect(skills).toContain("Node.js");
    expect(skills).toContain("AWS");
    expect(skills).toContain("Docker");
    expect(skills).toContain("Kubernetes");
    expect(skills).toContain("PostgreSQL");
    expect(skills).toContain("Redis");
  });

  it("returns an empty array for empty input", () => {
    expect(parseSkills("")).toEqual([]);
  });

  it("returns an empty array for text with no matching skills", () => {
    expect(parseSkills("We need someone who is passionate about cooking")).toEqual([]);
  });

  it("matches skills case-insensitively", () => {
    const skills = parseSkills("Experience with PYTHON, typescript, and Docker");
    expect(skills).toContain("Python");
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("Docker");
  });

  it("does not produce duplicates when a skill appears multiple times", () => {
    const description = "We use Python for data pipelines. Python is our primary language. Python Python Python.";
    const skills = parseSkills(description);
    const pythonCount = skills.filter((s) => s === "Python").length;
    expect(pythonCount).toBe(1);
  });

  it("returns results sorted alphabetically", () => {
    const description = "We use Docker, AWS, Python, and React daily.";
    const skills = parseSkills(description);
    const sorted = [...skills].sort();
    expect(skills).toEqual(sorted);
  });

  it("extracts soft skills from job descriptions", () => {
    const description = `
      Strong leadership and communication skills required.
      Must be experienced with agile methodology and stakeholder management.
      Cross-functional collaboration is essential.
    `;
    const skills = parseSkills(description);
    expect(skills).toContain("Leadership");
    expect(skills).toContain("Communication");
    expect(skills).toContain("Agile");
    expect(skills).toContain("Stakeholder Management");
    expect(skills).toContain("Cross-functional Collaboration");
  });
});
