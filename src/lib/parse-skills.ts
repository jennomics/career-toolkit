/**
 * Extracts skills/technologies from a job description by matching
 * against a known list of common skills and technologies.
 * This is a simple keyword-based approach — can be enhanced with AI later.
 */

const SKILL_PATTERNS: { pattern: RegExp; name: string }[] = [
  // Programming Languages
  { pattern: /\bpython\b/i, name: "Python" },
  { pattern: /\bjavascript\b/i, name: "JavaScript" },
  { pattern: /\btypescript\b/i, name: "TypeScript" },
  { pattern: /\bjava\b/i, name: "Java" },
  { pattern: /\bc\+\+\b/i, name: "C++" },
  { pattern: /\bc#\b/i, name: "C#" },
  { pattern: /\bruby\b/i, name: "Ruby" },
  { pattern: /\bgo\b(?!\s+(to|ahead|forward|back))/i, name: "Go" },
  { pattern: /\bgolang\b/i, name: "Go" },
  { pattern: /\brust\b/i, name: "Rust" },
  { pattern: /\bscala\b/i, name: "Scala" },
  { pattern: /\bkotlin\b/i, name: "Kotlin" },
  { pattern: /\bswift\b/i, name: "Swift" },
  { pattern: /\bphp\b/i, name: "PHP" },
  { pattern: /\br\b(?=\s+(programming|language|studio))/i, name: "R" },
  { pattern: /\bsql\b/i, name: "SQL" },

  // Frontend
  { pattern: /\breact\b/i, name: "React" },
  { pattern: /\bangular\b/i, name: "Angular" },
  { pattern: /\bvue\.?js?\b/i, name: "Vue.js" },
  { pattern: /\bnext\.?js\b/i, name: "Next.js" },
  { pattern: /\bsvelte\b/i, name: "Svelte" },
  { pattern: /\btailwind\b/i, name: "Tailwind CSS" },
  { pattern: /\bcss\b/i, name: "CSS" },
  { pattern: /\bhtml\b/i, name: "HTML" },

  // Backend & Infrastructure
  { pattern: /\bnode\.?js\b/i, name: "Node.js" },
  { pattern: /\bexpress\b/i, name: "Express" },
  { pattern: /\bdjango\b/i, name: "Django" },
  { pattern: /\bflask\b/i, name: "Flask" },
  { pattern: /\bspring\b/i, name: "Spring" },
  { pattern: /\brails\b/i, name: "Ruby on Rails" },
  { pattern: /\b\.net\b/i, name: ".NET" },
  { pattern: /\bfastapi\b/i, name: "FastAPI" },

  // Databases
  { pattern: /\bpostgres(ql)?\b/i, name: "PostgreSQL" },
  { pattern: /\bmysql\b/i, name: "MySQL" },
  { pattern: /\bmongodb\b/i, name: "MongoDB" },
  { pattern: /\bredis\b/i, name: "Redis" },
  { pattern: /\bdynamodb\b/i, name: "DynamoDB" },
  { pattern: /\belasticsearch\b/i, name: "Elasticsearch" },

  // Cloud & DevOps
  { pattern: /\baws\b/i, name: "AWS" },
  { pattern: /\bazure\b/i, name: "Azure" },
  { pattern: /\bgcp\b|google cloud/i, name: "Google Cloud" },
  { pattern: /\bdocker\b/i, name: "Docker" },
  { pattern: /\bkubernetes\b|\bk8s\b/i, name: "Kubernetes" },
  { pattern: /\bterraform\b/i, name: "Terraform" },
  { pattern: /\bci\/cd\b/i, name: "CI/CD" },
  { pattern: /\bgit\b/i, name: "Git" },
  { pattern: /\bjenkins\b/i, name: "Jenkins" },

  // Data & ML
  { pattern: /\bmachine learning\b/i, name: "Machine Learning" },
  { pattern: /\bdeep learning\b/i, name: "Deep Learning" },
  { pattern: /\btensorflow\b/i, name: "TensorFlow" },
  { pattern: /\bpytorch\b/i, name: "PyTorch" },
  { pattern: /\bpandas\b/i, name: "Pandas" },
  { pattern: /\bdata (science|engineering|analytics)\b/i, name: "Data Science" },
  { pattern: /\bspark\b/i, name: "Apache Spark" },
  { pattern: /\btableau\b/i, name: "Tableau" },
  { pattern: /\bpower\s?bi\b/i, name: "Power BI" },

  // Soft Skills & Practices
  { pattern: /\bagile\b/i, name: "Agile" },
  { pattern: /\bscrum\b/i, name: "Scrum" },
  { pattern: /\bjira\b/i, name: "Jira" },
  { pattern: /\bstakeholder management\b/i, name: "Stakeholder Management" },
  { pattern: /\bproject management\b/i, name: "Project Management" },
  { pattern: /\bcross[- ]functional\b/i, name: "Cross-functional Collaboration" },
  { pattern: /\bmentoring\b/i, name: "Mentoring" },
  { pattern: /\bleadership\b/i, name: "Leadership" },
  { pattern: /\bcommunication\b/i, name: "Communication" },
  { pattern: /\bproblem[- ]solving\b/i, name: "Problem Solving" },

  // APIs & Architecture
  { pattern: /\brest(ful)?\s*(api)?\b/i, name: "REST APIs" },
  { pattern: /\bgraphql\b/i, name: "GraphQL" },
  { pattern: /\bmicroservices\b/i, name: "Microservices" },
  { pattern: /\bsystem design\b/i, name: "System Design" },
  { pattern: /\bapi design\b/i, name: "API Design" },
];

export function parseSkills(description: string): string[] {
  const found = new Set<string>();

  for (const { pattern, name } of SKILL_PATTERNS) {
    if (pattern.test(description)) {
      found.add(name);
    }
  }

  return Array.from(found).sort();
}
