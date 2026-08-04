import { describe, it, expect } from "vitest";
import { parseResponsibilities } from "../parse-responsibilities";

describe("parseResponsibilities", () => {
  describe("basic action verb extraction", () => {
    it("extracts lines starting with action verbs", () => {
      const input = `
- Design and implement scalable microservices architecture
- Collaborate with cross-functional teams to deliver features
- Lead technical design reviews
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(3);
      expect(results[0].text).toBe("Design and implement scalable microservices architecture");
      expect(results[1].text).toBe("Collaborate with cross-functional teams to deliver features");
      expect(results[2].text).toBe("Lead technical design reviews");
    });

    it("capitalizes first letter after cleaning", () => {
      const input = "- design and implement scalable microservices architecture for the platform";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Design and implement scalable microservices architecture for the platform");
    });

    it("ignores lines that do not start with action verbs", () => {
      const input = `
- 5+ years of experience in software engineering
- Strong understanding of distributed systems
- Design and deploy production services
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(1);
      expect(results[0].text).toBe("Design and deploy production services");
    });
  });

  describe("bullet marker removal", () => {
    it("strips dash bullet markers", () => {
      const input = "- Develop RESTful APIs for backend services and data integration";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Develop RESTful APIs for backend services and data integration");
    });

    it("strips asterisk bullet markers", () => {
      const input = "* Build scalable distributed systems for real-time data processing";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Build scalable distributed systems for real-time data processing");
    });

    it("strips unicode bullet markers", () => {
      const input = "\u2022 Manage cross-functional engineering projects from inception to delivery";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Manage cross-functional engineering projects from inception to delivery");
    });

    it("strips numbered list markers with period", () => {
      const input = "1. Implement CI/CD pipelines for automated testing and deployment";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Implement CI/CD pipelines for automated testing and deployment");
    });

    it("strips numbered list markers with parenthesis", () => {
      const input = "2) Maintain production infrastructure and ensure high availability";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Maintain production infrastructure and ensure high availability");
    });
  });

  describe("prefix stripping", () => {
    it("strips 'you will' prefix and capitalizes resulting verb", () => {
      const input = "- You will design and implement new microservices for the platform";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Design and implement new microservices for the platform");
    });

    it("strips \"you'll\" prefix", () => {
      const input = "- You'll build scalable APIs and integrate with third-party services";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Build scalable APIs and integrate with third-party services");
    });

    it("strips 'responsible for' prefix when result starts with action verb", () => {
      const input = "- Responsible for developing and deploying core platform features regularly";
      const results = parseResponsibilities(input);
      // After stripping "Responsible for", result is "developing and deploying..."
      // which is capitalized to "Developing..." but "developing" is not an action verb.
      // The function only keeps lines that start with verbs from ACTION_VERBS.
      expect(results.length).toBe(0);
    });

    it("strips 'responsible for' prefix yielding action verb result", () => {
      const input = "- Responsible for design and implementation of scalable platform services";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Design and implementation of scalable platform services");
    });

    it("strips 'this role will' prefix", () => {
      const input = "- This role will drive technical strategy across the engineering organization";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Drive technical strategy across the engineering organization");
    });

    it("strips 'expected to' prefix", () => {
      const input = "- Expected to lead a team of 5 engineers on a greenfield project";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Lead a team of 5 engineers on a greenfield project");
    });

    it("strips 'required to' prefix", () => {
      const input = "- Required to manage multiple concurrent workstreams and project deliverables";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Manage multiple concurrent workstreams and project deliverables");
    });

    it("strips 'ability to' prefix", () => {
      const input = "- Ability to architect complex distributed systems for high throughput";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Architect complex distributed systems for high throughput");
    });

    it("strips 'help us' prefix", () => {
      const input = "- Help us build the next generation of our analytics platform for enterprises";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Build the next generation of our analytics platform for enterprises");
    });

    it("strips 'help to' prefix", () => {
      const input = "- Help to scale our infrastructure to handle millions of daily users";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Scale our infrastructure to handle millions of daily users");
    });
  });

  describe("line length filtering", () => {
    it("excludes lines shorter than 21 characters", () => {
      const input = "- Design systems\n- Build and maintain scalable cloud infrastructure for production";
      const results = parseResponsibilities(input);
      expect(results.length).toBe(1);
      expect(results[0].text).toContain("Build and maintain");
    });

    it("excludes lines longer than 300 characters", () => {
      const longLine = "Design " + "x".repeat(300);
      const input = `${longLine}\n- Build reliable distributed systems for large-scale data processing`;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(1);
      expect(results[0].text).toContain("Build reliable");
    });
  });

  describe("deduplication", () => {
    it("removes duplicate lines (case-insensitive)", () => {
      const input = `
- Build scalable microservices for production environments
- Build scalable microservices for production environments
- Deploy infrastructure using Terraform and Kubernetes pipelines
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(2);
    });

    it("deduplicates regardless of original casing", () => {
      const input = `
- design and implement APIs for the backend platform services
- Design and implement APIs for the backend platform services
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(1);
    });
  });

  describe("trailing period removal", () => {
    it("strips trailing periods from lines", () => {
      const input = "- Develop automated testing frameworks for continuous integration.";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Develop automated testing frameworks for continuous integration");
    });

    it("strips trailing period followed by whitespace", () => {
      const input = "- Manage production deployments across multiple cloud regions.  ";
      const results = parseResponsibilities(input);
      expect(results[0].text).toBe("Manage production deployments across multiple cloud regions");
    });
  });

  describe("section detection", () => {
    it("categorizes lines under 'responsibilities' section", () => {
      const input = `
Key Responsibilities for this role:
- Design high-throughput data pipelines for real-time analytics
- Build resilient microservice architectures for high availability
      `;
      const results = parseResponsibilities(input);
      expect(results.every((r) => r.category === "responsibility")).toBe(true);
    });

    it("categorizes lines under 'what you'll do' section", () => {
      const input = `
Here is what you'll do daily:
- Lead architecture decisions for the product engineering team
- Mentor junior engineers and conduct code reviews regularly
      `;
      const results = parseResponsibilities(input);
      expect(results.every((r) => r.category === "responsibility")).toBe(true);
    });

    it("categorizes lines under 'requirements' section as requirement", () => {
      const input = `
Minimum Requirements for this role:
- Build production systems serving millions of requests per day
- Develop CI/CD pipelines for automated testing and deployment
      `;
      const results = parseResponsibilities(input);
      expect(results.every((r) => r.category === "requirement")).toBe(true);
    });

    it("categorizes lines under 'qualifications' section as requirement", () => {
      const input = `
Required Qualifications and skills:
- Design and implement enterprise-grade security solutions systems
- Manage large-scale cloud infrastructure across multiple regions
      `;
      const results = parseResponsibilities(input);
      expect(results.every((r) => r.category === "requirement")).toBe(true);
    });

    it("categorizes lines under 'nice to have' section as qualification", () => {
      const input = `
These are nice to have skills:
- Develop mobile applications using React Native framework natively
- Build machine learning pipelines for recommendation systems
      `;
      const results = parseResponsibilities(input);
      expect(results.every((r) => r.category === "qualification")).toBe(true);
    });

    it("categorizes lines under 'preferred' section as qualification", () => {
      const input = `
Preferred skills and experience:
- Architect serverless solutions using AWS Lambda and Step Functions
- Implement observability stacks with Prometheus and Grafana dashboards
      `;
      const results = parseResponsibilities(input);
      expect(results.every((r) => r.category === "qualification")).toBe(true);
    });

    it("handles multiple sections in a single description", () => {
      const input = `
Here is what you'll do in this role:
- Design scalable backend systems using microservices architecture patterns
- Lead technical design reviews and engineering planning sessions

Minimum Requirements for this position:
- Build distributed systems at scale serving high traffic loads

These are nice to have for candidates:
- Implement machine learning models for production recommendation engines
      `;
      const results = parseResponsibilities(input);
      const responsibilities = results.filter((r) => r.category === "responsibility");
      const requirements = results.filter((r) => r.category === "requirement");
      const qualifications = results.filter((r) => r.category === "qualification");
      expect(responsibilities.length).toBe(2);
      expect(requirements.length).toBe(1);
      expect(qualifications.length).toBe(1);
    });

    it("detects 'what you will do' as responsibility section", () => {
      const input = `
Here is what you will do in this role:
- Develop features for our core platform and mobile applications
      `;
      const results = parseResponsibilities(input);
      expect(results[0].category).toBe("responsibility");
    });

    it("detects 'what we're looking for' as requirement section", () => {
      const input = `
This is what we're looking for in a candidate:
- Build highly available services with strong observability practices
      `;
      const results = parseResponsibilities(input);
      expect(results[0].category).toBe("requirement");
    });

    it("ignores section headers longer than 80 characters", () => {
      const input = `
This is a very long section header that should not be detected as a section because it exceeds the maximum allowed length of eighty characters:
- Design systems for high availability and fault tolerance in production
      `;
      const results = parseResponsibilities(input);
      // The long header won't be detected, so default category applies
      expect(results[0].category).toBe("responsibility");
    });
  });

  describe("keyword extraction", () => {
    it("extracts technology keywords from responsibility text", () => {
      const input = "- Design and implement microservices using Python and Kubernetes orchestration";
      const results = parseResponsibilities(input);
      expect(results[0].keywords).toContain("Python");
      expect(results[0].keywords).toContain("Kubernetes");
      expect(results[0].keywords).toContain("Microservices");
    });

    it("extracts multiple skill categories", () => {
      const input = "- Build React frontends with TypeScript and deploy to AWS cloud infrastructure";
      const results = parseResponsibilities(input);
      expect(results[0].keywords).toContain("React");
      expect(results[0].keywords).toContain("TypeScript");
      expect(results[0].keywords).toContain("AWS");
    });

    it("returns empty keywords for text without recognized skills", () => {
      const input = "- Lead weekly team standup meetings and planning sessions for the quarter";
      const results = parseResponsibilities(input);
      expect(results[0].keywords).toEqual([]);
    });
  });

  describe("action verb coverage", () => {
    it("recognizes common leadership verbs", () => {
      const input = `
- Lead engineering initiatives across multiple product teams and stakeholders
- Mentor junior developers through code reviews and pair programming sessions
- Guide architectural decisions for the platform engineering team quarterly
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(3);
    });

    it("recognizes common technical verbs", () => {
      const input = `
- Architect scalable cloud-native solutions for enterprise data platforms
- Deploy containerized applications to production Kubernetes clusters daily
- Automate infrastructure provisioning using Terraform modules and pipelines
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(3);
    });

    it("recognizes common delivery verbs", () => {
      const input = `
- Deliver high-quality features on tight deadlines for product launches
- Execute on the technical roadmap for the next two fiscal quarters
- Prioritize engineering tasks based on business impact and team capacity
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(3);
    });

    it("matches verbs case-insensitively", () => {
      const input = "- DESIGN and implement a new authentication service for the platform";
      const results = parseResponsibilities(input);
      expect(results.length).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty input", () => {
      expect(parseResponsibilities("")).toEqual([]);
    });

    it("returns empty array for whitespace-only input", () => {
      expect(parseResponsibilities("   \n  \n  ")).toEqual([]);
    });

    it("returns empty array for input with no action-verb lines", () => {
      const input = `
About Our Company:
We are a fast-growing startup building the next generation platform.
Our team is passionate about creating great software.
5+ years experience required.
      `;
      expect(parseResponsibilities(input)).toEqual([]);
    });

    it("handles input with mixed content and bullet styles", () => {
      const input = `
About the role:
We're looking for a senior engineer.

Here is what you'll do in this role:
- Design distributed systems for real-time event processing pipelines
* Build APIs that serve millions of requests per day reliably
\u2022 Collaborate with product managers to define project specifications clearly

Minimum requirements for candidates:
1. Develop production-grade software in multiple programming languages
2. Manage cloud infrastructure using infrastructure-as-code tooling
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(5);
      const responsibilities = results.filter((r) => r.category === "responsibility");
      const requirements = results.filter((r) => r.category === "requirement");
      expect(responsibilities.length).toBe(3);
      expect(requirements.length).toBe(2);
    });

    it("handles real-world job description excerpt", () => {
      const input = `
Senior Software Engineer - Backend

About the Role for this position:
Join our team building the next generation of cloud infrastructure.

Key Duties for this engineering position:
- Design and implement scalable backend services using Go and Python
- Build and maintain CI/CD pipelines for automated testing and deployment
- Collaborate with product and design teams to deliver new features quickly
- Mentor junior engineers and contribute to engineering culture growth

What we're looking for in candidates:
- Develop production systems at scale with distributed architectures setup
- Manage cloud infrastructure on AWS or GCP for production workloads

Preferred skills for this position:
- Implement machine learning models for production recommendation systems
      `;
      const results = parseResponsibilities(input);
      expect(results.length).toBe(7);

      const responsibilities = results.filter((r) => r.category === "responsibility");
      const requirements = results.filter((r) => r.category === "requirement");
      const qualifications = results.filter((r) => r.category === "qualification");

      expect(responsibilities.length).toBe(4);
      expect(requirements.length).toBe(2);
      expect(qualifications.length).toBe(1);

      // Verify keywords were extracted
      const goLine = results.find((r) => r.text.includes("Go and Python"));
      expect(goLine?.keywords).toContain("Python");

      const cicdLine = results.find((r) => r.text.includes("CI/CD"));
      expect(cicdLine?.keywords).toContain("CI/CD");
    });
  });
});
