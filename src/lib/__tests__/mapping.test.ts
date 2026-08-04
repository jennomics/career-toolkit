import { describe, it, expect } from "vitest";
import {
  mapClaimsToQuestions,
  extractSignificantWords,
  type ClaimForMapping,
  type HiringQuestion,
} from "../decomposition/mapping";

describe("extractSignificantWords", () => {
  it("extracts words longer than 3 characters", () => {
    const words = extractSignificantWords("Can she do the technical work?");
    expect(words).toContain("technical");
    expect(words).toContain("work");
    expect(words).not.toContain("she");
    expect(words).not.toContain("the");
  });

  it("excludes stop words", () => {
    const words = extractSignificantWords("they have been through this quickly");
    expect(words).not.toContain("they");
    expect(words).not.toContain("have");
    expect(words).not.toContain("been");
    expect(words).not.toContain("through");
    expect(words).not.toContain("this");
    expect(words).toContain("quickly");
  });

  it("lowercases all words", () => {
    const words = extractSignificantWords("Technical LEADERSHIP skills");
    expect(words).toContain("technical");
    expect(words).toContain("leadership");
    expect(words).toContain("skills");
  });
});

describe("mapClaimsToQuestions", () => {
  const sampleClaims: ClaimForMapping[] = [
    {
      id: "claim-1",
      statement: "Led a team of 12 engineers through a complex platform migration to cloud infrastructure",
      artifacts: [
        { passageText: "Managed cross-functional team during complex infrastructure migration spanning multiple services" },
      ],
    },
    {
      id: "claim-2",
      statement: "Scaled distributed data pipeline from 1TB to 50TB daily throughput under production pressure",
      artifacts: [
        { passageText: "Built and scaled distributed data pipeline processing under tight deadlines with production pressure" },
      ],
    },
    {
      id: "claim-3",
      statement: "Drove technical strategy for Series B startup",
      artifacts: [
        { passageText: "Defined technical roadmap and architecture decisions" },
      ],
    },
  ];

  const sampleQuestions: HiringQuestion[] = [
    {
      question: "Can she lead the engineering team through a complex infrastructure migration?",
      rationale: "Platform migration is the immediate priority",
    },
    {
      question: "Can he build and scale distributed data pipeline under production pressure?",
      rationale: "Data volume is growing 10x",
    },
    {
      question: "Does she have startup fundraising experience with investors?",
      rationale: "Company needs someone who understands investor dynamics",
    },
  ];

  it("matches questions to claims based on keyword overlap", () => {
    const report = mapClaimsToQuestions(sampleQuestions, sampleClaims);

    // First question about team/migration should match claim-1
    const q1 = report.questions[0];
    expect(q1.claimIds).toContain("claim-1");
    expect(q1.gap).toBe(false);

    // Second question about scale/data should match claim-2
    const q2 = report.questions[1];
    expect(q2.claimIds).toContain("claim-2");
    expect(q2.gap).toBe(false);
  });

  it("flags questions with no matching claims as gaps", () => {
    const report = mapClaimsToQuestions(sampleQuestions, sampleClaims);

    // Third question about fundraising/investor - unlikely to match any claim
    const q3 = report.questions[2];
    expect(q3.gap).toBe(true);
    expect(q3.claimIds).toHaveLength(0);

    // Should appear in the gaps report
    expect(report.gaps).toContainEqual({ question: q3.question });
  });

  it("marks all questions as gaps when claims array is empty", () => {
    const report = mapClaimsToQuestions(sampleQuestions, []);

    expect(report.questions.every((q) => q.gap === true)).toBe(true);
    expect(report.gaps).toHaveLength(sampleQuestions.length);
    expect(report.covered).toHaveLength(0);
  });

  it("includes covered questions in the covered report", () => {
    const report = mapClaimsToQuestions(sampleQuestions, sampleClaims);

    // At least the first two questions should be covered
    expect(report.covered.length).toBeGreaterThan(0);
    for (const item of report.covered) {
      expect(item.claimIds.length).toBeGreaterThan(0);
    }
  });

  it("preserves question and rationale in output", () => {
    const report = mapClaimsToQuestions(sampleQuestions, sampleClaims);

    for (let i = 0; i < sampleQuestions.length; i++) {
      expect(report.questions[i].question).toBe(sampleQuestions[i].question);
      expect(report.questions[i].rationale).toBe(sampleQuestions[i].rationale);
    }
  });
});
