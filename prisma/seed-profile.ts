import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No database URL found. Set POSTGRES_URL or DATABASE_URL in .env"
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding candidate profile data...");

  // Delete existing data in reverse dependency order
  await prisma.writingSample.deleteMany({});
  await prisma.unresolvedItem.deleteMany({});
  await prisma.profileMetric.deleteMany({});
  await prisma.signatureStory.deleteMany({});
  await prisma.careerRole.deleteMany({});
  await prisma.candidateProfile.deleteMany({});

  // Create the CandidateProfile
  const profile = await prisma.candidateProfile.create({
    data: {
      name: "Jenna Lang",
      location: "Pasadena, CA (open to Bay Area, Remote)",
      phone: "(626) 676-1019",
      email: "jenna.lang@gmail.com",
      linkedin: "linkedin.com/in/REDACTED_ALT_NAME",
      github: "github.com/jennomics",
      currentTitle: "Director, AI & Data Products",
      reportsTo: "VP/SVP Engineering or CTO",
      positioningStatements: [
        "I build the infrastructure that lets genomics companies stop talking about AI and actually ship it: production models, real-time pipelines, and platforms that make bench scientists self-sufficient.",
        "My career has been one long answer to the question: How do you get a regulated, data-heavy industry to move at startup speed? I do it by combining deep bioinformatics fluency with modern ML/platform engineering so that science teams spend time on discovery, not plumbing.",
        "I am the person you hire when your AI strategy is a slide deck and needs to become a product. I have done this at a 50-person startup (Freenome), a mid-scale platform (PetDNA/Wisdom Panel), and an enterprise data org (Illumina), each time standing up teams, shipping v1, and driving adoption.",
      ],
      selfDescribedStrengths: [
        "Translating messy, regulated science into shippable AI products",
        "Building and coaching cross-functional teams (ML + bio + eng) from zero",
        "Designing platforms that abstract complexity so domain experts self-serve",
        "Operating at startup speed inside large, risk-averse organizations",
        "Communicating technical roadmaps to non-technical stakeholders (C-suite, commercial, regulatory)",
      ],
      technicalInventory: `## ML/AI
PyTorch, TensorFlow, scikit-learn, XGBoost, LightGBM, HuggingFace Transformers, LangChain, PEFT/LoRA, RLHF, GPT-4/Claude API integration, MLflow, Weights & Biases, SageMaker, Vertex AI

## Bioinformatics
Nextflow/nf-core, WDL/Cromwell, GATK, BWA/Bowtie2, samtools/bcftools, htslib, Picard, VEP/SnpEff, STAR, Salmon, DESeq2, scanpy, Cell Ranger, IGV, Ensembl/NCBI APIs

## Data/Platform
Spark, Databricks, Airflow, Prefect, dbt, Snowflake, BigQuery, Redshift, PostgreSQL, DynamoDB, Delta Lake, Kafka, Pulsar, Flink, Terraform, Kubernetes, Docker, ArgoCD, GitHub Actions, CircleCI

## Languages & Frameworks
Python, R, Scala, TypeScript, SQL, Go, Bash, Next.js, FastAPI, Flask, React, Node.js

## Accreditations
AWS SAA-C03, GCP PDE, HIPAA/SOC2 audit experience`,
      educationCredentials: `- MS Bioinformatics, Johns Hopkins University (2012)
- BS Biology + CS minor, UCLA (2009)
- AWS Solutions Architect - Associate (SAA-C03, 2023)
- GCP Professional Data Engineer (2022)`,
      recognitionPresence: `- Patent pending - 'Method for ancestry-informative marker selection in low-coverage WGS' (Wisdom Panel, filed 2021)
- Published - 'Scalable variant calling pipeline for consumer genomics' - ASHG poster 2020
- Conference talk - 'Production ML in regulated genomics' - MLOps Community Meetup 2023
- Internal keynote - 'AI Transformation Roadmap' presented to Illumina SVP Engineering + CPO (2024)`,
      operatingPrinciples: [
        "Ship weekly, learn daily - velocity is a feature",
        "Make the right thing the easy thing (platform > process docs)",
        "Hire for slope, coach for altitude",
        "Decisions are two-way doors until proven otherwise",
        "If it is not in the DAG, it does not exist (observability first)",
        "Protect the team calendar like you protect prod uptime",
      ],
      writingStyle:
        "Direct, concrete, evidence-first. Leads with the outcome or number, then explains the mechanism. Avoids buzzwords unless they are the industry-standard term. Uses first person sparingly and only for ownership. Comfortable with technical depth but defaults to the altitude appropriate for the audience. Humor is dry, rare, and never at anyone else\u2019s expense.",
      selfDescribedPosture:
        "Builder-leader. I am happiest (and most impactful) when I own a zero-to-one problem that requires both technical architecture and team-building. I do not want a pure people-management role; I need enough technical surface area to stay dangerous. At the same time, I have outgrown pure IC work: I want to multiply my output through a team of 5 to 15 senior ICs and leads.",
      searchTargetLevel:
        "Director or Sr. Director, Engineering / AI / Data Products. Open to VP title at a smaller company (Series B-C) if scope matches.",
      searchGeography:
        "Pasadena, CA (will not relocate). Open to: Bay Area hybrid (1-2x/month), fully remote US-based, or LA-based.",
      searchCompanies: [
        "Anthropic",
        "Tempus AI",
        "Illumina (different org)",
        "Freenome (re-hire)",
        "Color Health",
        "Invitae (post-restructuring)",
        "Recursion Pharmaceuticals",
        "Grail / Galleri",
        "Arc Institute",
        "Insitro",
        "Genentech (computational)",
        "Scale AI (bio vertical)",
      ],
      searchFirms: [
        "Sequoia Talent (genomics/AI)",
        "True Search (life science tech)",
        "Daversa Partners",
      ],
      resumeOperatingRules: [
        "Every bullet must pass the so-what test: quantified impact or named decision",
        "No orphan bullets - each role needs 3-6 achievement lines",
        "Verb-first construction (Designed, Built, Led, Shipped) - never starts with Responsible for",
        "Technical depth is appropriate to the reader: for a hiring manager at Anthropic, include model architecture choices; for a VP Eng at Tempus, emphasize team/velocity/outcomes",
        "One-page for most applications; two-page extended version available for roles that request it",
        "The summary section is 2-3 sentences max and must name the level, domain, and signature outcome",
      ],
      knownGaps: `1. **No FAANG pedigree** - Reframe: breadth across regulated + startup + enterprise is rarer and more relevant for biotech AI.
2. **Formal management tenure is 4 years** - But scope (30+ ICs, multi-team) is Director-equivalent; the titles lagged the scope at smaller companies.
3. **No peer-reviewed first-author ML paper** - Offset with patent pending, ASHG poster, and shipped production models with measurable outcomes.
4. **Scala/JVM depth is moderate** - Fine for Spark but would not claim principal-level JVM engineering.`,
      personalBackground:
        "First-generation college graduate; parents run a small landscaping business in Pomona. This shapes my bias toward pragmatic, ship-it culture over academic purity. I mentor two women-in-STEM undergrads through the Johns Hopkins alumni network. Outside work: competitive amateur baker (sourdough and French pastry), trail running in the San Gabriels, and a very opinionated corgi named Biscuit.",
    },
  });

  console.log(`Created profile: ${profile.id}`);

  // Career Roles (sorted most recent first, sortOrder 1=most recent)
  const roles = [
    {
      sortOrder: 1,
      period: "2023-Present",
      organization: "Illumina",
      title: "Director, AI & Data Products",
      scope: "12-person team (ML engineers, data engineers, bioinformaticians). Reports to VP Engineering.",
      highlights: [
        "Built AI Products team from zero: hired 12 ICs across ML, data, and bio in 6 months",
        "Shipped production ML models processing genomic data at scale with 99.97% uptime SLA",
        "Drove $2.4M annual compute savings through pipeline optimization and infrastructure consolidation",
        "Presented AI Transformation Roadmap to SVP Engineering and CPO, securing multi-year funding",
        "Established MLOps practices: model registry, A/B testing framework, automated retraining pipelines",
        "Led cross-functional collaboration with research, clinical, and commercial teams to align AI product roadmap",
      ],
    },
    {
      sortOrder: 2,
      period: "2022-2023",
      organization: "Illumina",
      title: "Sr. Manager, ML Platform",
      scope: "8-person platform team. Reports to Sr. Director Engineering.",
      highlights: [
        "Designed and shipped internal ML platform serving 40+ data scientists across 3 business units",
        "Achieved NPS 67 internal platform satisfaction score within first year of launch",
        "Migrated 400+ pipelines from legacy infrastructure to nf-core/Nextflow in 9 months (vs. 24-month estimate)",
        "Reduced mean time to production for ML models from 3 weeks to under 48 hours",
        "Implemented cost observability layer saving $800K/year in unused cloud resources",
        "Promoted to Director after 14 months based on scope expansion and team growth",
      ],
    },
    {
      sortOrder: 3,
      period: "2020-2022",
      organization: "PetDNA (Wisdom Panel)",
      title: "Lead Data Scientist / Acting Director",
      scope: "6-person ML team + 3 contractors. Reports to CTO.",
      highlights: [
        "Built ML breed-identification system processing 500K+ samples/year with 98.2% accuracy",
        "Filed patent for ancestry-informative marker selection in low-coverage WGS",
        "Scaled data pipeline from 50K to 500K annual samples without additional headcount",
        "Led company rebrand data migration (PetDNA to Wisdom Panel) with zero downtime",
        "Shipped ethnicity/communities feature for underrepresented populations ahead of schedule",
        "Managed $1.2M annual cloud budget, reducing per-sample cost by 40% through architecture redesign",
      ],
    },
    {
      sortOrder: 4,
      period: "2018-2020",
      organization: "Freenome",
      title: "Senior Bioinformatics Engineer",
      scope: "IC reporting to VP Computational Biology. Collaborated with 15-person research team.",
      highlights: [
        "Rebuilt cfDNA analysis pipeline (SideView 2.0), cutting runtime by 70% and enabling 3x throughput",
        "Designed variant-calling architecture that became the foundation for Freenome's clinical assay",
        "Implemented automated QC framework catching 94% of sample-quality issues before analysis",
        "Contributed to Series C fundraising materials with technical architecture documentation",
        "Mentored 3 junior bioinformaticians, two of whom were promoted within 18 months",
      ],
    },
    {
      sortOrder: 5,
      period: "2015-2018",
      organization: "Illumina",
      title: "Bioinformatics Scientist II",
      scope: "IC in Clinical Genomics division. 4-person variant calling team.",
      highlights: [
        "Developed 3x faster variant-calling pipeline adopted as default for clinical whole-genome sequencing",
        "Published ASHG poster on scalable variant calling for consumer genomics",
        "Built internal tool for automated pipeline benchmarking against truth sets (Genome in a Bottle)",
        "Collaborated with regulatory team on FDA submission documentation for clinical-grade pipelines",
      ],
    },
    {
      sortOrder: 6,
      period: "2013-2015",
      organization: "Children's Hospital Los Angeles",
      title: "Bioinformatics Analyst",
      scope: "Center for Personalized Medicine. Reports to Director of Bioinformatics.",
      highlights: [
        "Analyzed pediatric cancer genomes supporting clinical decision-making for 200+ patients",
        "Built automated reporting pipeline reducing turnaround time from 5 days to 18 hours",
        "Maintained HIPAA-compliant data infrastructure for genomic data storage and analysis",
        "Trained clinical fellows on interpretation of genomic variants using IGV and custom visualization tools",
      ],
    },
    {
      sortOrder: 7,
      period: "2012-2013",
      organization: "Johns Hopkins APL",
      title: "Research Associate (Bioinformatics)",
      scope: "Biosurveillance division. 3-person computational team.",
      highlights: [
        "Developed metagenomic classification pipeline for environmental biosurveillance samples",
        "Reduced false-positive rate by 60% through improved reference database curation",
        "Contributed to DoD-funded pathogen detection project with classified deliverables",
      ],
    },
    {
      sortOrder: 8,
      period: "2010-2012",
      organization: "Johns Hopkins Bloomberg School of Public Health",
      title: "Graduate Research Assistant",
      scope: "Department of Biostatistics. Advisor: Dr. Sarah Mitchell.",
      highlights: [
        "Thesis: 'Statistical methods for ancestry inference from low-coverage sequencing data'",
        "Implemented novel HMM-based ancestry caller achieving 95% concordance with high-coverage methods",
        "TAed two semesters of Applied Genomic Data Analysis (60+ students per semester)",
      ],
    },
    {
      sortOrder: 9,
      period: "2008-2009",
      organization: "UCLA Department of Human Genetics",
      title: "Undergraduate Research Intern",
      scope: "Population genetics lab. Part-time during senior year.",
      highlights: [
        "Assisted with GWAS data processing and quality control for Type 2 Diabetes study",
        "Wrote Python scripts for automated SNP filtering and population stratification checks",
        "Co-authored internal lab report on ancestry-informative marker panel design",
      ],
    },
  ];

  for (const role of roles) {
    await prisma.careerRole.create({
      data: {
        profileId: profile.id,
        ...role,
      },
    });
  }
  console.log(`Created ${roles.length} career roles`);

  // Signature Stories
  const stories = [
    {
      title: "The Nextflow Migration",
      situation:
        "Illumina had 400+ bioinformatics pipelines spread across 6 different workflow engines, maintained by teams who had each chosen their own tooling over a decade. No shared infrastructure, no common monitoring, and a 24-month estimate from a previous failed consolidation attempt.",
      obstacle:
        "Pipeline owners were deeply attached to their existing tools. Each team had optimized their workflows for their specific use case and saw migration as risk with no upside. The previous attempt had failed because it tried to force everyone onto a single rigid template.",
      action:
        "Took a platform-product approach rather than a mandate approach. Built a migration toolkit that auto-converted 80% of pipeline logic to nf-core format, then offered white-glove migration support for the remaining 20%. Created a 'migration score' dashboard showing each team their technical debt cost in dollars/month. Ran weekly office hours and paired with resistant teams to show the benefits firsthand. Sequenced migrations by starting with teams who were already frustrated with their tooling.",
      result:
        "Completed full migration in 9 months (vs. 24-month estimate). 400+ pipelines running on nf-core with unified monitoring. $2.4M annual compute savings from shared infrastructure. Mean time to deploy new pipeline dropped from 2 weeks to 2 days. Platform NPS score of 67.",
      whyItMatters:
        "Demonstrates ability to drive large-scale technical change through influence rather than authority. Shows product thinking applied to internal platforms - treating internal engineers as customers rather than compliance targets.",
    },
    {
      title: "PetDNA Breed Detection at Scale",
      situation:
        "PetDNA (later Wisdom Panel) needed to scale their ML breed-identification system from 50K samples/year to 500K+ to support a consumer product launch with a major retail partner. The existing system was a research prototype that required manual intervention for edge cases.",
      obstacle:
        "The ML model had been built for accuracy in controlled conditions but fell apart at scale: edge cases multiplied, compute costs grew linearly, and the manual QC step created a bottleneck that could not scale with volume. Additionally, the team was 3 people with no dedicated ML engineer.",
      action:
        "Redesigned the architecture from batch-processing to streaming, with automated QC gates at each stage. Built an ensemble model that routed easy cases (purebreds, common mixes) through a fast classifier and only sent ambiguous cases to the expensive deep model. Hired 3 contractors for data labeling and built an active-learning loop to continuously improve edge-case handling. Negotiated 40% cloud cost reduction through reserved instances and spot-instance architecture.",
      result:
        "System processed 500K+ samples/year with 98.2% accuracy and 40% lower per-sample cost. Zero manual intervention required for 95% of samples. Enabled the retail partnership launch on schedule. Filed patent for the ancestry-informative marker selection method.",
      whyItMatters:
        "Shows end-to-end ownership from ML architecture to infrastructure to business outcome. Demonstrates ability to scale a system 10x without proportional team or cost growth - the kind of efficiency thinking that matters at growth-stage companies.",
    },
    {
      title: "The AI Transformation No One Asked For",
      situation:
        "Illumina's genomics division had world-class sequencing hardware but was falling behind on the software/AI side. Competitors were shipping AI-powered analysis tools while Illumina's data products were still largely rule-based. There was no dedicated AI products team, no ML infrastructure, and no executive sponsor for an AI strategy.",
      obstacle:
        "Multiple previous proposals for AI investment had stalled in committee. Engineering leadership saw AI as 'research science' not ready for production. The existing bioinformatics teams were protective of their domain expertise and skeptical that ML could outperform hand-tuned algorithms. Budget was tight post-pandemic.",
      action:
        "Built a skunkworks proof-of-concept on nights and weekends using existing cloud credits: an ML model that outperformed the rule-based variant filter by 15% on truth-set benchmarks. Packaged results as a 3-page memo showing performance gain, projected compute savings, and competitive threat analysis. Presented to SVP Engineering and CPO jointly (not separately) to avoid the 'which budget' problem. Proposed a funded pilot: 3 people, 90 days, one production use case.",
      result:
        "Secured approval for 12-person AI Products team with multi-year funding commitment. Within first year, shipped 3 production ML models and established MLOps infrastructure. The team became a company-wide shared service, adopted by Clinical, Research, and Consumer divisions. Led to Director promotion.",
      whyItMatters:
        "Demonstrates entrepreneurial leadership within large organizations. Shows ability to build executive consensus without positional authority, and to derisk big bets through rapid prototyping. This is the zero-to-one team-building story.",
    },
    {
      title: "SideView 2.0",
      situation:
        "Freenome's cfDNA (cell-free DNA) analysis pipeline, SideView, was the core technology behind their cancer detection assay. As the company moved toward clinical validation, the pipeline needed to process 3x more samples without proportional cost increase, while maintaining the sensitivity required for early cancer detection.",
      obstacle:
        "The original pipeline was built for research throughput and had accumulated significant technical debt. It was monolithic, running on a single large instance per sample, with no parallelization at the analysis step level. Rewriting it risked introducing subtle bugs in a domain where false negatives have life-or-death consequences.",
      action:
        "Designed a modular architecture that decomposed the pipeline into independent analysis stages, each with its own validation test suite. Built a shadow-mode system that ran new and old pipelines in parallel on the same samples for 6 weeks, comparing results at every intermediate step. Implemented a custom DAG scheduler optimized for the uneven compute profile of cfDNA analysis (some steps are I/O-bound, others CPU-bound).",
      result:
        "70% runtime reduction while maintaining 100% concordance with the validated pipeline on 10,000 comparison samples. Enabled 3x throughput on existing infrastructure. Architecture became the foundation for Freenome's clinical assay submission. Zero production incidents in first 6 months post-launch.",
      whyItMatters:
        "Shows ability to modernize critical production systems without disruption. Demonstrates rigorous validation methodology appropriate for high-stakes domains - relevant for any company where model errors have real consequences (healthcare, finance, safety).",
    },
    {
      title: "The Ethnicity/Communities Launch",
      situation:
        "Illumina's consumer genomics division needed to ship an ancestry product that served underrepresented populations - communities that existing products (23andMe, AncestryDNA) handled poorly due to reference panel bias. This was both a market opportunity and a DEI imperative.",
      obstacle:
        "Reference panels for underrepresented populations were sparse and lower-quality. Standard imputation methods performed poorly on low-coverage data from these populations. The product team wanted to launch in Q4 2017 for holiday sales, giving the technical team only 5 months. There was also sensitivity around how to communicate ancestry results for populations with histories of exploitation by genetics research.",
      action:
        "Partnered with population geneticists to curate expanded reference panels using publicly available datasets (1000 Genomes, HGDP, PAGE). Developed a novel marker-selection algorithm optimized for ancestry-informative SNPs in admixed populations. Worked with UX research and an external ethics advisory board to develop culturally sensitive result presentation. Built automated accuracy benchmarks stratified by population to catch bias in model updates.",
      result:
        "Shipped on schedule in Q4 2017. Launched with 30+ new population groups that competitors did not offer. Accuracy for underrepresented populations improved from 72% to 94%. Product received positive coverage in genetics community for responsible representation. Zero customer complaints related to cultural sensitivity in first year.",
      whyItMatters:
        "Demonstrates ability to ship products that balance technical innovation, ethical considerations, and business timelines. Shows cross-functional leadership across engineering, research, UX, and external stakeholders. Relevant for any company building AI products that affect diverse populations.",
    },
  ];

  for (const story of stories) {
    await prisma.signatureStory.create({
      data: {
        profileId: profile.id,
        ...story,
      },
    });
  }
  console.log(`Created ${stories.length} signature stories`);

  // Profile Metrics
  const metrics = [
    { label: "Pipelines migrated to nf-core", value: "400+" },
    { label: "Migration timeline (vs. 24-month estimate)", value: "9 months" },
    { label: "Runtime reduction (SideView 2.0)", value: "70%" },
    { label: "Samples/year processed (PetDNA)", value: "500K+" },
    { label: "Annual compute savings (Illumina)", value: "$2.4M" },
    { label: "ICs managed across 3 teams", value: "30+" },
    { label: "Pipeline uptime (production SLA)", value: "99.97%" },
    { label: "Patents filed (2 pending, 1 granted, 1 provisional)", value: "4" },
    { label: "Team built from zero (AI Products)", value: "12-person" },
    { label: "Throughput improvement (variant calling)", value: "3x" },
    { label: "Internal platform satisfaction score (NPS)", value: "67" },
    { label: "Mean time to production (ML models)", value: "< 48 hours" },
  ];

  for (const metric of metrics) {
    await prisma.profileMetric.create({
      data: {
        profileId: profile.id,
        label: metric.label,
        value: metric.value,
      },
    });
  }
  console.log(`Created ${metrics.length} profile metrics`);

  // Unresolved Items
  const unresolvedItems = [
    {
      section: "Career Timeline",
      description:
        "Illumina title discrepancy: LinkedIn says 'Director' but offer letter says 'Sr. Manager, promoted to Director' - need to confirm exact promotion date for resume timeline.",
      optionA: "Use 'Director' throughout (matches current title and LinkedIn)",
      optionB: "Show progression: 'Sr. Manager (2022-2023) -> Director (2023-Present)'",
      priority: "high",
    },
    {
      section: "Career Narrative",
      description:
        "Freenome departure framing: left for family reasons vs. left for Wisdom Panel opportunity - which narrative for which audience?",
      optionA: "Family reasons (authentic, humanizing, but may raise concerns about commitment)",
      optionB: "Opportunity-driven (emphasizes growth mindset, standard career narrative)",
      priority: "medium",
    },
    {
      section: "Branding",
      description:
        "PetDNA vs Wisdom Panel branding: company rebranded mid-tenure; which name to use on resume? Use both with note?",
      optionA: "Use 'Wisdom Panel (formerly PetDNA)' consistently",
      optionB: "Use 'PetDNA / Wisdom Panel' to show full tenure context",
      priority: "low",
    },
    {
      section: "Credentials",
      description:
        "Patent status: 'filed 2021' but current status unclear - granted? Still pending? Need to verify.",
      optionA: "List as 'Patent pending' (safe, conservative)",
      optionB: "Research actual status and update accordingly",
      priority: "high",
    },
    {
      section: "Metrics",
      description:
        "Illumina AI Products team size: '12-person team' in some notes, '15-person team' in others - confirm actual headcount at peak.",
      optionA: "Use '12-person team' (more conservative, defensible)",
      optionB: "Use '12-15 person team' with note about contractors",
      priority: "medium",
    },
    {
      section: "Metrics",
      description:
        "SideView 2.0 metrics: '70% runtime reduction' vs '65% cost reduction' - are both accurate? Can we claim both?",
      optionA: "Use only '70% runtime reduction' (most impressive, clearly measurable)",
      optionB: "Claim both with different contexts (runtime for technical roles, cost for business roles)",
      priority: "medium",
    },
    {
      section: "Career Timeline",
      description:
        "Consumer ancestry launch date: was it Q3 or Q4 2017? Affects the 'shipped in X months' claim.",
      optionA: "Use 'Q4 2017' (matches holiday sales narrative)",
      optionB: "Verify exact date and adjust timeline claims accordingly",
      priority: "low",
    },
    {
      section: "Legal/NDA",
      description:
        "Freenome - can she publicly reference the cfDNA work or is it under NDA? This affects which bullets she can use.",
      optionA: "Use generic language: 'liquid biopsy analysis pipeline' without specifics",
      optionB: "Reference only what is in public domain (patents, publications, press releases)",
      priority: "high",
    },
  ];

  for (const item of unresolvedItems) {
    await prisma.unresolvedItem.create({
      data: {
        profileId: profile.id,
        ...item,
      },
    });
  }
  console.log(`Created ${unresolvedItems.length} unresolved items`);

  // Writing Sample - Anthropic Cover Letter
  const coverLetterContent = `Dear Hiring Team,

I build the infrastructure that lets AI-native companies stop talking about responsible scaling and actually ship it. Your Director of AI Products role is the intersection of everything I have spent the last decade doing: production ML systems, cross-functional team leadership, and making complex technical capabilities accessible to users who are not ML engineers.

At Illumina, I stood up a 12-person AI Products team from zero and shipped production models that process genomic data at scale - 400+ pipelines migrated, $2.4M in annual compute savings, 99.97% uptime SLA. The translation challenge is similar to what Anthropic faces: how do you take cutting-edge model capabilities and turn them into products that real users trust, in a domain where errors have consequences?

Three things I would bring on day one:

1. A playbook for zero-to-one AI product teams in regulated, high-stakes domains. I have done this three times (Freenome, Wisdom Panel, Illumina) and know where the landmines are.

2. Technical fluency across the stack. I can review model architecture decisions in the morning and present the product roadmap to the CPO in the afternoon. I do not need an interpreter between research and product.

3. A bias toward shipping. My teams deploy to production in under 48 hours mean time. I believe velocity is a feature, and I build the platform guardrails that make speed safe.

I am particularly drawn to Anthropic's approach to product development - the idea that safety and capability are not in tension but are the same problem. My experience building AI products in genomics (where a wrong variant call has real consequences) has given me deep respect for that framing.

I would welcome the chance to discuss how my experience translates to your product challenges.

Jenna Lang`;

  await prisma.writingSample.create({
    data: {
      profileId: profile.id,
      title: "Anthropic Cover Letter",
      content: coverLetterContent,
      context:
        "Written for a Director of AI Products role at Anthropic. Demonstrates voice, technical depth calibration, and narrative structure.",
    },
  });
  console.log("Created 1 writing sample");

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
