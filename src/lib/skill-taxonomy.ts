/**
 * Hierarchical skill taxonomy with normalization.
 * Maps variant names to canonical forms and organizes skills into categories.
 */

export interface SkillNode {
  canonicalName: string;
  aliases: string[];
}

export interface Subcategory {
  name: string;
  skills: SkillNode[];
}

export interface Category {
  name: string;
  type: "hard" | "soft";
  subcategories: Subcategory[];
}

export interface Taxonomy {
  categories: Category[];
}

export interface SkillClassification {
  category: string;
  subcategory: string;
}

/**
 * The full hierarchical taxonomy tree.
 */
const TAXONOMY: Taxonomy = {
  categories: [
    {
      name: "Hard Skills",
      type: "hard",
      subcategories: [
        {
          name: "Programming Languages",
          skills: [
            { canonicalName: "Python", aliases: ["python", "py"] },
            { canonicalName: "JavaScript", aliases: ["javascript", "js", "es6", "es2015", "ecmascript"] },
            { canonicalName: "TypeScript", aliases: ["typescript", "ts"] },
            { canonicalName: "Java", aliases: ["java", "j2ee"] },
            { canonicalName: "C++", aliases: ["c++", "cpp", "cplusplus"] },
            { canonicalName: "C#", aliases: ["c#", "csharp", "c sharp"] },
            { canonicalName: "Ruby", aliases: ["ruby"] },
            { canonicalName: "Go", aliases: ["go", "golang"] },
            { canonicalName: "Rust", aliases: ["rust"] },
            { canonicalName: "Scala", aliases: ["scala"] },
            { canonicalName: "Kotlin", aliases: ["kotlin"] },
            { canonicalName: "Swift", aliases: ["swift"] },
            { canonicalName: "PHP", aliases: ["php"] },
            { canonicalName: "R", aliases: ["r", "r programming", "r language"] },
            { canonicalName: "SQL", aliases: ["sql", "structured query language"] },
            { canonicalName: "Bash", aliases: ["bash", "shell", "shell scripting", "sh"] },
          ],
        },
        {
          name: "Frontend",
          skills: [
            { canonicalName: "React", aliases: ["react", "reactjs", "react.js", "react js"] },
            { canonicalName: "Angular", aliases: ["angular", "angularjs", "angular.js"] },
            { canonicalName: "Vue.js", aliases: ["vue", "vuejs", "vue.js", "vue js"] },
            { canonicalName: "Next.js", aliases: ["next", "nextjs", "next.js", "next js"] },
            { canonicalName: "Svelte", aliases: ["svelte", "sveltekit"] },
            { canonicalName: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
            { canonicalName: "CSS", aliases: ["css", "css3", "stylesheets"] },
            { canonicalName: "HTML", aliases: ["html", "html5"] },
            { canonicalName: "Redux", aliases: ["redux", "react-redux"] },
            { canonicalName: "Webpack", aliases: ["webpack"] },
          ],
        },
        {
          name: "Backend",
          skills: [
            { canonicalName: "Node.js", aliases: ["node", "nodejs", "node.js", "node js"] },
            { canonicalName: "Express", aliases: ["express", "expressjs", "express.js"] },
            { canonicalName: "Django", aliases: ["django"] },
            { canonicalName: "Flask", aliases: ["flask"] },
            { canonicalName: "Spring", aliases: ["spring", "spring boot", "springboot"] },
            { canonicalName: "Ruby on Rails", aliases: ["rails", "ruby on rails", "ror"] },
            { canonicalName: ".NET", aliases: [".net", "dotnet", "asp.net", "aspnet"] },
            { canonicalName: "FastAPI", aliases: ["fastapi", "fast api"] },
            { canonicalName: "REST APIs", aliases: ["rest", "restful", "rest api", "rest apis", "restful api", "restful apis"] },
            { canonicalName: "GraphQL", aliases: ["graphql", "graph ql"] },
            { canonicalName: "Microservices", aliases: ["microservices", "micro services", "microservice architecture"] },
          ],
        },
        {
          name: "Databases",
          skills: [
            { canonicalName: "PostgreSQL", aliases: ["postgresql", "postgres", "pg"] },
            { canonicalName: "MySQL", aliases: ["mysql"] },
            { canonicalName: "MongoDB", aliases: ["mongodb", "mongo"] },
            { canonicalName: "Redis", aliases: ["redis"] },
            { canonicalName: "DynamoDB", aliases: ["dynamodb", "dynamo db", "dynamo"] },
            { canonicalName: "Elasticsearch", aliases: ["elasticsearch", "elastic search", "elastic"] },
            { canonicalName: "Cassandra", aliases: ["cassandra", "apache cassandra"] },
            { canonicalName: "SQLite", aliases: ["sqlite"] },
          ],
        },
        {
          name: "Cloud & DevOps",
          skills: [
            { canonicalName: "AWS", aliases: ["aws", "amazon web services"] },
            { canonicalName: "Azure", aliases: ["azure", "microsoft azure"] },
            { canonicalName: "Google Cloud", aliases: ["gcp", "google cloud", "google cloud platform"] },
            { canonicalName: "Docker", aliases: ["docker", "containerization", "containers"] },
            { canonicalName: "Kubernetes", aliases: ["kubernetes", "k8s", "kube"] },
            { canonicalName: "Terraform", aliases: ["terraform", "tf", "iac", "infrastructure as code"] },
            { canonicalName: "CI/CD", aliases: ["ci/cd", "cicd", "ci cd", "continuous integration", "continuous deployment", "continuous delivery"] },
            { canonicalName: "Git", aliases: ["git", "github", "gitlab", "version control"] },
            { canonicalName: "Jenkins", aliases: ["jenkins"] },
            { canonicalName: "Linux", aliases: ["linux", "unix"] },
            { canonicalName: "Ansible", aliases: ["ansible"] },
            { canonicalName: "Serverless", aliases: ["serverless", "lambda", "aws lambda"] },
          ],
        },
        {
          name: "Data & ML",
          skills: [
            { canonicalName: "Machine Learning", aliases: ["machine learning", "ml", "statistical learning"] },
            { canonicalName: "Deep Learning", aliases: ["deep learning", "dl", "neural networks", "neural nets"] },
            { canonicalName: "TensorFlow", aliases: ["tensorflow", "tf"] },
            { canonicalName: "PyTorch", aliases: ["pytorch", "torch"] },
            { canonicalName: "Pandas", aliases: ["pandas"] },
            { canonicalName: "Data Science", aliases: ["data science", "data analytics", "data analysis", "data engineering"] },
            { canonicalName: "Apache Spark", aliases: ["spark", "apache spark", "pyspark"] },
            { canonicalName: "Tableau", aliases: ["tableau"] },
            { canonicalName: "Power BI", aliases: ["power bi", "powerbi"] },
            { canonicalName: "Natural Language Processing", aliases: ["nlp", "natural language processing", "text mining"] },
            { canonicalName: "Computer Vision", aliases: ["computer vision", "cv", "image recognition"] },
            { canonicalName: "LLM", aliases: ["llm", "large language model", "large language models", "gpt", "generative ai", "gen ai"] },
            { canonicalName: "NumPy", aliases: ["numpy"] },
            { canonicalName: "Scikit-learn", aliases: ["scikit-learn", "sklearn", "scikit learn"] },
          ],
        },
        {
          name: "Architecture & Design",
          skills: [
            { canonicalName: "System Design", aliases: ["system design", "systems design", "architecture design"] },
            { canonicalName: "API Design", aliases: ["api design"] },
            { canonicalName: "Design Patterns", aliases: ["design patterns", "software patterns"] },
            { canonicalName: "Event-Driven Architecture", aliases: ["event-driven", "event driven architecture", "eda", "message queues"] },
            { canonicalName: "Domain-Driven Design", aliases: ["ddd", "domain-driven design", "domain driven design"] },
          ],
        },
        {
          name: "Security",
          skills: [
            { canonicalName: "Cybersecurity", aliases: ["cybersecurity", "security", "information security", "infosec"] },
            { canonicalName: "OAuth", aliases: ["oauth", "oauth2", "oauth 2.0", "authentication"] },
            { canonicalName: "Encryption", aliases: ["encryption", "cryptography"] },
          ],
        },
        {
          name: "Testing & QA",
          skills: [
            { canonicalName: "Unit Testing", aliases: ["unit testing", "unit tests", "jest", "junit", "pytest"] },
            { canonicalName: "Integration Testing", aliases: ["integration testing", "integration tests"] },
            { canonicalName: "Test-Driven Development", aliases: ["tdd", "test-driven development", "test driven development"] },
            { canonicalName: "Selenium", aliases: ["selenium", "webdriver"] },
            { canonicalName: "Cypress", aliases: ["cypress"] },
          ],
        },
      ],
    },
    {
      name: "Soft Skills",
      type: "soft",
      subcategories: [
        {
          name: "Leadership",
          skills: [
            { canonicalName: "Leadership", aliases: ["leadership", "team leadership", "tech lead", "technical leadership"] },
            { canonicalName: "Mentoring", aliases: ["mentoring", "coaching", "mentorship"] },
            { canonicalName: "People Management", aliases: ["people management", "team management", "managing teams", "direct reports"] },
            { canonicalName: "Strategic Thinking", aliases: ["strategic thinking", "strategy", "strategic planning"] },
            { canonicalName: "Decision Making", aliases: ["decision making", "decision-making"] },
          ],
        },
        {
          name: "Communication",
          skills: [
            { canonicalName: "Communication", aliases: ["communication", "written communication", "verbal communication", "communications"] },
            { canonicalName: "Presentation Skills", aliases: ["presentation skills", "presentations", "public speaking"] },
            { canonicalName: "Technical Writing", aliases: ["technical writing", "documentation", "docs"] },
            { canonicalName: "Stakeholder Management", aliases: ["stakeholder management", "stakeholder engagement", "executive communication"] },
          ],
        },
        {
          name: "Project Management",
          skills: [
            { canonicalName: "Agile", aliases: ["agile", "agile methodology", "agile development"] },
            { canonicalName: "Scrum", aliases: ["scrum", "scrum master"] },
            { canonicalName: "Jira", aliases: ["jira", "atlassian jira"] },
            { canonicalName: "Project Management", aliases: ["project management", "program management", "pm", "pmp"] },
            { canonicalName: "Product Management", aliases: ["product management", "product owner", "product strategy"] },
            { canonicalName: "Kanban", aliases: ["kanban"] },
          ],
        },
        {
          name: "Collaboration",
          skills: [
            { canonicalName: "Cross-functional Collaboration", aliases: ["cross-functional", "cross functional", "cross-functional collaboration", "cross-team collaboration"] },
            { canonicalName: "Teamwork", aliases: ["teamwork", "team player", "collaboration", "collaborative"] },
            { canonicalName: "Conflict Resolution", aliases: ["conflict resolution", "negotiation"] },
          ],
        },
        {
          name: "Problem Solving",
          skills: [
            { canonicalName: "Problem Solving", aliases: ["problem solving", "problem-solving", "analytical thinking", "critical thinking"] },
            { canonicalName: "Innovation", aliases: ["innovation", "creative thinking", "creativity"] },
            { canonicalName: "Adaptability", aliases: ["adaptability", "flexibility", "adaptable"] },
            { canonicalName: "Attention to Detail", aliases: ["attention to detail", "detail-oriented", "detail oriented"] },
          ],
        },
      ],
    },
  ],
};

/**
 * Build the normalization map from the taxonomy.
 * Maps lowercased variant -> canonical name.
 */
function buildNormalizationMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of TAXONOMY.categories) {
    for (const subcategory of category.subcategories) {
      for (const skill of subcategory.skills) {
        // Map canonical name (lowercased) to itself
        map.set(skill.canonicalName.toLowerCase(), skill.canonicalName);
        // Map all aliases
        for (const alias of skill.aliases) {
          map.set(alias.toLowerCase(), skill.canonicalName);
        }
      }
    }
  }
  return map;
}

const normalizationMap = buildNormalizationMap();

/**
 * Build a classification map: canonical name -> { category, subcategory }
 */
function buildClassificationMap(): Map<string, SkillClassification> {
  const map = new Map<string, SkillClassification>();
  for (const category of TAXONOMY.categories) {
    for (const subcategory of category.subcategories) {
      for (const skill of subcategory.skills) {
        map.set(skill.canonicalName, {
          category: category.name,
          subcategory: subcategory.name,
        });
      }
    }
  }
  return map;
}

const classificationMap = buildClassificationMap();

/**
 * Normalize a raw skill name to its canonical form.
 * Returns the canonical name if found, otherwise returns the original trimmed string.
 */
export function normalizeSkillName(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  return normalizationMap.get(lower) || trimmed;
}

/**
 * Categorize a skill name (should be canonical or raw).
 * Returns the category and subcategory, or null if not in the taxonomy.
 */
export function categorizeSkill(name: string): SkillClassification | null {
  // First try exact match on canonical
  const direct = classificationMap.get(name);
  if (direct) return direct;

  // Try normalizing first, then look up
  const normalized = normalizeSkillName(name);
  return classificationMap.get(normalized) || null;
}

/**
 * Get the full taxonomy tree.
 */
export function getTaxonomy(): Taxonomy {
  return TAXONOMY;
}

/**
 * Get all canonical skill names from the taxonomy.
 */
export function getAllCanonicalNames(): string[] {
  const names: string[] = [];
  for (const category of TAXONOMY.categories) {
    for (const subcategory of category.subcategories) {
      for (const skill of subcategory.skills) {
        names.push(skill.canonicalName);
      }
    }
  }
  return names;
}

/**
 * Get the normalization map entries (for debugging/API).
 */
export function getNormalizationMapSize(): number {
  return normalizationMap.size;
}
