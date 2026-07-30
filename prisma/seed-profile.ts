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

  // Create the CandidateProfile with Jenna's actual data
  const profile = await prisma.candidateProfile.create({
    data: {
      name: "Jenna Lang, PhD",
      location: "Sacramento, CA",
      phone: "916-690-5889",
      email: "jennomics@gmail.com",
      linkedin: "linkedin.com/in/REDACTED_ALT_NAME",
      github: "github.com/jennomics",
      currentTitle: "Senior Director, DNA Science R&D — AncestryDNA",
      reportsTo: "Head of Product",
      positioningStatements: [
        "I build decision environments — data platforms architected around the decisions they need to power, not around how data is easiest to store. When every team — science, clinical, product, executive — works from the same precision-grade, contextualized view, the organization stops debating what's true and starts deciding what to do.",
        "I think big without losing operational grip. I connect what most organizations keep separate — wet lab biology, cloud-scale engineering, AI, regulatory reality, and executive strategy — and I build toward outcomes where every stakeholder sees their win in the solution. The result is momentum that holds.",
        "20 years of building data infrastructure where the biology is complex, the data are vast, and the stakes are identity and human health.",
      ],
      selfDescribedStrengths: [
        "Problem-solving and making connections between ideas, people, and goals",
        "Thinks in graphs",
      ],
      technicalInventory: `**Biological AI & genomics:** genomic foundation models, biological sequence modeling, multi-omics integration, variant analysis, metagenomics, phylogenomics, population genetics, relationship inference, pedigree modeling

**AI/ML:** deep learning, fine-tuning, graph neural networks (GATv2 attention, heterogeneous GNNs), reinforcement learning, LLM agents and tooling, RAG, evaluation and benchmark design, MLOps, PyTorch, TensorFlow, scikit-learn, XGBoost

**Data architecture:** data lake design (Lake Formation, Glue, Athena), governed data platforms, semantic layer design, ontology, data lineage, access control, Apache Iceberg

**Cloud & infrastructure:** AWS (SageMaker, Batch, Lambda, FSx, EMR, Bedrock), Docker, Nextflow, Kubernetes, GPU-accelerated computing, CI/CD, infrastructure as code

**Regulated environments:** HIPAA, GDPR, SaMD design controls, CLIA-adjacent data governance, research reproducibility, responsible AI policy authorship, dual-use risk governance

**Languages:** Python, R, Bash, SQL, TypeScript, Perl

**Recent hands-on build:** career-toolkit (github.com/jennomics/career-toolkit) — full-stack application shipped to production. Next.js, TypeScript, Prisma, Tailwind, CI workflows, deployed on Vercel. 183 commits. Built using agentic tooling and structured agent task specifications.`,
      educationCredentials: `PhD, Microbiology & Bioinformatics — University of California, Davis
MS, Quantitative Biology & Population Genetics — University of Texas, Arlington
BS, Biology & Genetics — University of New Orleans

**Executive education:**
- MIT Sloan — Artificial Intelligence: Implications for Business Strategy (2024)
- Women's executive leadership program — institution and year UNRESOLVED (see Unresolved Items)

**Certifications:**
- AWS Certified Solutions Architect – Professional
- AWS Certified Solutions Architect – Associate
- AWS Certified Machine Learning – Specialty`,
      recognitionPresence: `- Patent U.S. 11,385,215 — microbial soil health metrics (Trace Genomics)
- 20 peer-reviewed publications, 1,200+ citations
- Invited speaker, NASA (2021)
- Speaker, NVIDIA GTC
- OpenFold consortium — brokered AWS entry with NVIDIA as co-founding partner
- Wrote an EB-1B recommendation letter for a staff AI/ML engineer, demonstrating standing to evaluate research contributions at an international level`,
      operatingPrinciples: [
        "Do not reinvent the wheel — leverage existing mechanisms before creating new ones",
        "Build to scale — prioritize developer experience and five-year business needs over quick fixes",
        "Move fast on two-way-door decisions — do not evaluate every possible solution",
        "Break down silos — prioritize collective improvement over protecting one team's way of working",
        "Minimize undifferentiated heavy lifting — use managed services, prioritize science over infrastructure management",
      ],
      writingStyle: "Direct and structurally organized. Opens with the decision, supports it afterward. Tiers work explicitly and states what is gating versus non-gating. Names her own misses in writing — her 2022 strategy review records flatly that she was too ambitious on timing and that the team ran on autopilot during PetDNA. Very few executives document that.",
      selfDescribedPosture: "I think big and I'm willing to take on risk, even when success is not guaranteed. But I always de-risk.",
      searchTargetLevel: "VP or executive director in computational biology, AI/ML, or life sciences. Currently also evaluating manager-level roles at frontier AI labs where the work is closer to the problem.",
      searchGeography: "Sacramento-based. Bay Area hybrid acceptable if compensation justifies it. Relocation and heavy in-office requirements are a family decision, not a solo one.",
      searchCompanies: [
        "Anthropic", "OpenAI", "NVIDIA", "Oracle Health & AI", "Eli Lilly",
        "Myriad Genetics", "Insmed", "Veracyte", "Natera", "Revolution Medicines",
        "Syner-G", "Radial/Astera", "Sequencing.com", "Travere Therapeutics",
      ],
      searchFirms: ["Korn Ferry", "Spencer Stuart", "Slone Partners", "WittKieffer"],
      resumeOperatingRules: [
        "Maximum honest advocacy",
        "No fitness verdicts — do not tell her whether she is qualified, give her the material and let her decide",
        "Gaps become one-time questions, answered once and added to this profile",
        "The 30-year career spine leads; do not anchor the story to Ancestry",
      ],
      knownGaps: `**Hands-on coding currency.** She has not been in production code in over a decade. She architects, directs, and unblocks. For roles that require reading and writing production code, the honest position is: point to career-toolkit as evidence she still builds, using agentic tooling rather than typing every line. Do not claim day-to-day coding.

**Recent publication record.** Twenty publications and 1,200+ citations, but largely from the UC Davis era. For research-scientist roles that want recent end-to-end research she personally led, this is thin.

**Drug discovery and therapeutics.** No experience. Her domains are consumer genomics, agricultural microbiome, and multi-omics health platforms. Roles requiring therapeutic hypothesis generation or drug development lifecycle experience are not a fit and should not be pursued.

**Scope on manager-level applications.** She currently runs 26 people across three managers. Applying to a manager role is a visible step down and will be read as either a red flag or flight risk unless addressed directly. Her honest answer — that she wants to be closer to the work than a senior director role allows — is credible and should be stated rather than avoided.`,
      personalBackground: "First-generation college graduate. National Merit Scholar. Only child of a single mother. Turned down UNC and Carnegie Mellon for a full ride at the University of New Orleans. Former competitive figure skater, ages 9–16. Walk-up song: \"Burning Down the House,\" Talking Heads.",
    },
  });

  console.log(`Created profile: ${profile.id}`);

  // Career Roles - from Section 3 & 4 of the candidate profile
  const roles = [
    {
      sortOrder: 1,
      period: "2022 – present",
      organization: "AncestryDNA",
      title: "Senior Director, DNA Science R&D",
      scope: "26-person organization across three managers and three principal scientists. Full lifecycle from research through production-ready systems. Reports into the executive team.",
      highlights: [
        "Leading development of a DNA foundation model — fine-tuning open-source genomic language models on 30 million REDACTED_FORBIDDEN_PHRASE_1",
        "Directing graph neural network models for biological relationship inference, including directional link prediction (aunt vs. niece, grandparent vs. grandchild)",
        "Directing an LLM research agent that helps genealogists analyze DNA match clusters using domain-specific tools, retrieval, contextual reasoning, and interactive visualization",
        "Rebuilt the organization post-layoff from 11 to 26 engineers and scientists",
        "Team satisfaction raised from 72 to 83",
        "Manual maintenance reduced from ~75–80% of capacity to under 5–10%",
        "Annual AWS R&D compute cost cut ~50% — from over $350K/year to $180K/year",
        "Authored AncestryDNA's Responsible Use of AI policy",
        "Established a Center of Excellence unifying reproducibility, ethics, and research governance",
        "PetDNA: Concept to market in six months. Hit Year 1 revenue targets. First production generative AI deployment at Ancestry. Vendor relationships worth ~$30M in annual savings.",
        "Just-in-time computation system serving real-time lookup across full 30M-customer REDACTED_FORBIDDEN_PHRASE_2",
        "Governed DNA data lake design replacing legacy Cloud Data Vault",
      ],
    },
    {
      sortOrder: 2,
      period: "2021 – 2022",
      organization: "AncestryDNA",
      title: "Director, Research & Bioinformatics",
      scope: "Promoted within six months to sole leadership of the R&D organization.",
      highlights: [
        "Containerized and orchestrated all bioinformatics pipelines (Docker, Nextflow, AWS Batch)",
        "Established four strategic priorities: Integrate, Automate, MLOps, Move to Managed",
        "Rebuilt team culture following AncestryHealth wind-down layoffs",
      ],
    },
    {
      sortOrder: 3,
      period: "2020 – 2021",
      organization: "Amazon Web Services",
      title: "Worldwide Tech Leader, AI/ML — Healthcare & Life Sciences",
      scope: "Principal technical advisor to pharmaceutical companies, biotechs, and academic medical centers worldwide.",
      highlights: [
        "Led a $2M multi-institution initiative to build an open-source alternative to AlphaFold",
        "Brokered AWS entry into the OpenFold consortium with NVIDIA as co-founding partner",
        "Authored Nextflow + AWS Batch reference architecture that became basis for AWS HealthOmics",
        "Defined global AI/ML strategy and go-to-market investment for the segment",
      ],
    },
    {
      sortOrder: 4,
      period: "2019 – 2020",
      organization: "Amazon Web Services",
      title: "Senior Solutions Architect, AI/ML & Bioinformatics",
      scope: null,
      highlights: [
        "Designed compliant, scalable bioinformatics and ML platforms for biotech, pharma, and research customers",
        "Accelerated cloud-native deep learning adoption for multi-omics and biomedical research",
      ],
    },
    {
      sortOrder: 5,
      period: "2018 – 2019",
      organization: "iCarbonX",
      title: "Director, Bioinformatics & Product Development",
      scope: "Managed globally distributed R&D teams across the US, China, and Israel.",
      highlights: [
        "Led end-to-end development of a HIPAA-compliant multimodal biomedical data platform under SaMD design controls",
        "Delivered federated multi-omics analysis under strict data residency and compliance constraints",
      ],
    },
    {
      sortOrder: 6,
      period: "2017 – 2018",
      organization: "BioConsortia",
      title: "Senior Bioinformatics Scientist",
      scope: null,
      highlights: [
        "Built ML models for microbial genomics — increased hit-to-lead success 5x",
        "Raised microbe identification accuracy from 10% to 50%",
      ],
    },
    {
      sortOrder: 7,
      period: "2016 – 2017",
      organization: "Trace Genomics",
      title: "Bioinformatics Scientist, Founding Employee",
      scope: "Also functioned as early product lead.",
      highlights: [
        "Sole author of the bioinformatics pipeline behind the first customer-facing soil microbiome diagnostic platform",
        "Cornerstone patent: U.S. 11,385,215 — microbial soil health metrics",
      ],
    },
    {
      sortOrder: 8,
      period: "2007 – 2016",
      organization: "UC Davis",
      title: "PhD Candidate, then Postdoctoral Researcher",
      scope: "Computational biology research in microbial taxonomy and phylogenomics.",
      highlights: [
        "Co-PI on a $750K NIH grant",
        "Led a multi-institute global research project",
        "Supervised a 7-member team",
      ],
    },
    {
      sortOrder: 9,
      period: "2001 – 2012",
      organization: "Joint Genome Institute (DOE)",
      title: "Senior Research Associate",
      scope: null,
      highlights: [
        "Contributed to the Human Genome Project",
        "Developed sequencing pipelines for high-throughput microbial and eukaryotic genomics",
        "Self-taught Perl to move from bench science into bioinformatics",
      ],
    },
  ];

  for (const role of roles) {
    await prisma.careerRole.create({ data: { profileId: profile.id, ...role } });
  }
  console.log(`Created ${roles.length} career roles`);

  // Signature Stories - from Section 5
  const stories = [
    {
      title: "The Nextflow Migration",
      situation: "The PTER matching algorithm had been developed in 2019 and sat unimplemented for four years. Production Engineering estimated nine months of work. PTER was 20x more compute-efficient and enabled SideView. The production pipeline was brittle — logic tightly coupled to infrastructure.",
      obstacle: "Production Engineering leadership insisted their pipeline was 'best in class' and demanded side-by-side benchmarks against Nextflow. The benchmark demand was a stall.",
      action: "Refused to run the comparison. Brought in the Nextflow company for demos and free training. Worked with product leadership to prioritize SideView features PTER unlocked. Coupled PTER deployment to the Nextflow re-architecture. De-risked personally: learned the production pipeline, re-architected it, hired a contractor from her own budget, paid for the enterprise license, and had her own team process matching workloads to bridge the transition.",
      result: "GA adopted Nextflow, modernized the pipeline, and shipped PTER and SideView — one of Ancestry's most important differentiating features. Reset how DNA Science and Engineering work together.",
      whyItMatters: "This is technical judgment, political strategy, and personal risk-taking in one story. Most executives have one of the three.",
    },
    {
      title: "PetDNA — 0 to 1 inside a public company",
      situation: "Ancestry needed a new revenue stream. No dedicated team, budget, or timeline for PetDNA.",
      obstacle: "Had to ship a new business line inside a public company with minimal resources. Core team ran on autopilot because her attention was elsewhere.",
      action: "Single-Threaded Owner / Senior Technical Officer. Drove concept to market in six months. First production generative AI at Ancestry — automated all site image and text, AI translation and localization, a full social platform, two third-party integrations in under two months.",
      result: "Hit Year 1 revenue targets. Vendor relationships worth ~$30M in annual savings.",
      whyItMatters: "Demonstrates zero-to-one entrepreneurship inside a large, public company. Shows willingness to personally absorb scope and risk.",
    },
    {
      title: "The AI Transformation",
      situation: "AI adoption was a strategic necessity for DNA Science but the team had no formal AI training program.",
      obstacle: "Needed to transform a diverse team of scientists, engineers, and ML practitioners without disrupting product delivery.",
      action: "Built a full AI training curriculum in early 2024 with differentiated learning paths by persona. Wrote the memo defining how every role's expectations would change.",
      result: "100% AWS AI Practitioner certification org-wide, with specialized certifications for DNA Science Engineering and ML Science teams.",
      whyItMatters: "Shows ability to drive cultural and capability transformation, not just technical change.",
    },
    {
      title: "SideView 2.0 — the cost argument",
      situation: "SV2 rollout required updating match labels. Three options cost $140K, $183K, and $650K — all required batch migration of up to 1.48 trillion rows across 30M customers.",
      obstacle: "Three engineering leaders and an SVP had signed off on expensive approaches. The assumption that batch migration was required had not been challenged.",
      action: "Proposed version-keyed match data hydrated lazily on customer login via the Match Calculator.",
      result: "~$15K compute vs. $140K–$650K. No batch migration. Rollback as a flag flip. Aurora cost reduced from $80K/month to $20–32K/month.",
      whyItMatters: "Demonstrates reading a cost model, finding the assumption everyone accepted, and reframing the problem. Directed at an SVP and three engineering leaders.",
    },
    {
      title: "Ethnicity and Communities Automation",
      situation: "Ethnicity updates and new community development were manual, expensive processes consuming months of effort.",
      obstacle: "Each ethnicity update took 12 months. New community development required extensive manual work.",
      action: "Built tooling with DNA Ops: automation of polygon creation, semi-automated community detection, community classification models on SageMaker.",
      result: "Ethnicity update dev time: 12 months → 2 months. Community dev time: 80% reduction. Content team saved a month+ of manual effort per year.",
      whyItMatters: "Shows systematic elimination of undifferentiated heavy lifting — a recurring career theme.",
    },
  ];

  for (const story of stories) {
    await prisma.signatureStory.create({ data: { profileId: profile.id, ...story } });
  }
  console.log(`Created ${stories.length} signature stories`);

  // Profile Metrics - from Section 6
  const metrics = [
    { label: "Organization size", value: "26 (3 managers, 3 principal scientists)" },
    { label: "Organization rebuild", value: "11 → 26 post-layoff" },
    { label: "Team satisfaction", value: "72 → 83" },
    { label: "Feature delivery increase", value: "7x or 10x — UNRESOLVED" },
    { label: "Features shipped", value: "4/year (2021) → 30+/year (2024)" },
    { label: "Innovation vs. maintenance", value: "20% innovation (2021) → 90% innovation (current)" },
    { label: "AWS spend reduction", value: "~50%; $350K+/yr → $180K/yr, held 2024–2025" },
    { label: "PetDNA time to market", value: "6 months" },
    { label: "PetDNA vendor savings", value: "~$30M annually" },
    { label: "PTER compute efficiency", value: "20x" },
    { label: "Ethnicity dev time", value: "12 months → 2 months" },
    { label: "Community dev time", value: "80% reduction" },
    { label: "BioConsortia hit-to-lead", value: "5x" },
    { label: "Microbe ID accuracy", value: "10% → 50%" },
    { label: "NIH grant (Co-PI)", value: "$750K" },
    { label: "OpenFold initiative", value: "$2M multi-institution" },
    { label: "DNA foundation model scale", value: "30M REDACTED_FORBIDDEN_PHRASE_1" },
    { label: "Match database scale", value: "1.48 trillion rows, 30M customers" },
    { label: "Publications", value: "20 peer-reviewed" },
    { label: "Citations", value: "1,200+" },
  ];

  for (const metric of metrics) {
    await prisma.profileMetric.create({ data: { profileId: profile.id, ...metric } });
  }
  console.log(`Created ${metrics.length} profile metrics`);

  // Unresolved Items - from Section 12
  const unresolvedItems = [
    {
      section: "Executive Education",
      description: "Institution stated two different ways. A credential error is more damaging than a date error.",
      optionA: "UC Berkeley — Women's Executive Leadership Program (2025)",
      optionB: "Stanford Graduate School of Business — Executive Program in Women's Leadership Education (enrolled, 2026)",
      priority: "high",
    },
    {
      section: "Metrics",
      description: "Feature delivery multiplier differs across versions. Self-evaluation shows 4→30+ features = ~7.5x.",
      optionA: "7x (April 2026 version)",
      optionB: "10x (NVIDIA, Oracle, and general versions)",
      priority: "high",
    },
    {
      section: "Career Timeline",
      description: "Career length undercounted. JGI start is 2001 = 25 years, not 20.",
      optionA: "Keep '20+ years' (current resume language)",
      optionB: "Correct to '25 years' (factually accurate)",
      priority: "medium",
    },
    {
      section: "Career Timeline",
      description: "JGI (2001–2012) and UC Davis (2007–2016) overlap by five years. Screeners flag unexplained overlaps.",
      optionA: "Add note explaining concurrent positions during graduate study",
      optionB: "Leave as-is and address only if asked",
      priority: "medium",
    },
    {
      section: "Career Timeline",
      description: "UC Davis dates conflict: 2007–2016 vs. 2012–2016 (postdoc only) vs. ~2004–2014.",
      optionA: "2007–2016 (PhD through postdoc, most common version)",
      optionB: "Separate into PhD (2007–2012) and Postdoc (2012–2016)",
      priority: "medium",
    },
    {
      section: "Career Timeline",
      description: "Ancestry start: most say Director 2021–2022 then Senior Director 2022–present. One says Senior Director from 2021.",
      optionA: "Director 2021–2022, then Senior Director 2022–present",
      optionB: "Senior Director from 2021",
      priority: "medium",
    },
    {
      section: "Titles",
      description: "Title variations across versions for every role. Inconsistency across applications to the same company is a real risk.",
      optionA: "Use titles from candidate profile Section 3 timeline (most comprehensive)",
      optionB: "Use titles from most recent resume version submitted",
      priority: "high",
    },
    {
      section: "Metrics",
      description: "Customer scale figure varies: 25M, 29M, and 30M across documents. Pedigrees stated as 10M in one.",
      optionA: "Use '30M' (highest, most recent)",
      optionB: "Use 'over 25M' (conservative, always defensible)",
      priority: "low",
    },
  ];

  for (const item of unresolvedItems) {
    await prisma.unresolvedItem.create({ data: { profileId: profile.id, ...item } });
  }
  console.log(`Created ${unresolvedItems.length} unresolved items`);

  // Writing Sample - Anthropic Cover Letter (actual text from Claude Opus)
  await prisma.writingSample.create({
    data: {
      profileId: profile.id,
      title: "Anthropic Cover Letter — Manager, Applied AI Engineering",
      context: "Written by Claude Opus for Manager, Applied AI Engineering, Beneficial Deployments (Life Sciences). Demonstrates: direct voice, vulnerability addressing (level mismatch, coding currency), strategic reframing against job description, connecting non-linear career dots.",
      content: `I am applying for the Manager, Applied AI Engineering, Beneficial Deployments role for Life Sciences.

I have spent 25 years at the point where biology meets computation — starting on the Human Genome Project at the Joint Genome Institute, and now leading a 26-person organization at AncestryDNA that spans ML engineering, research engineering, bioinformatics, and science. The through-line is not any one technology. It is getting scientific capability out of research and into systems that people actually use, inside organizations where the data are sensitive and the governance bar is real.

That is the job described in this posting, and I have done a version of it before. At AWS I was the worldwide technical leader for AI/ML in healthcare and life sciences — forward-deployed with pharmaceutical companies, biotechs, and academic medical centers, working through what it actually takes to move AI from a promising demo into regulated production. I led a $2M multi-institution effort to build an open-source alternative to AlphaFold, aligning academic and public-sector partners around shared infrastructure. I carried what I learned in the field back to the service teams as roadmap input, and wrote the Nextflow and AWS Batch reference architecture that became foundational to AWS HealthOmics. Translating deployments into product direction is a loop I have run at scale.

At Ancestry I have been on the other side of that relationship — the scientific organization trying to absorb AI. I authored and won executive approval for a three-year AI transformation strategy, rebuilt the team from 11 to 26 people, raised feature delivery sevenfold, and cut compute cost in half. My team now builds AI agents and tooling for scientific workflows: graph neural network models for biological relationship inference, and an LLM research agent that helps genealogists work through DNA match clusters using retrieval, domain tools, and contextual reasoning. I am currently leading development of a DNA foundation model fine-tuned on 30 million REDACTED_FORBIDDEN_PHRASE_1.

The responsible deployment part of this role is not an afterthought for me. Consumer genetic data is a dual-use domain in the plainest sense — the same data that reunites families can be used to expose them. I wrote AncestryDNA's Responsible Use of AI policy and stood up a Center of Excellence for reproducibility, ethics, and research governance. Before that, I built a HIPAA-compliant multimodal platform at iCarbonX under SaMD design controls with teams split across the US and China and hard data-residency constraints. I know what it costs to do this properly and I would rather pay that cost than explain later why we did not.

On the hands-on requirement: I am not the person merging pull requests day to day, and I will not claim otherwise. What I will say is that I still build. I recently shipped a full-stack application to production — Next.js, TypeScript, Prisma, CI, deployed — working through agentic tooling and structured agent task specifications rather than by typing every line. The repository is public at github.com/jennomics/career-toolkit. I think that is closer to how engineering leadership will work than the alternative, and I would rather show it than argue it.

One thing worth naming directly: I am a Senior Director applying for a Manager role. That is deliberate. I have spent a significant share of the last few years fighting for my organization to be in the rooms where decisions get made, and less of it than I would like on the work itself. This role puts me back against the actual problem — deployed AI inside the world's leading scientific organizations — with a team small enough that I am in it rather than three layers above it. I am not looking for a title. I am looking for the work.`,
    },
  });
  console.log("Created 1 writing sample (Anthropic cover letter)");

  console.log("\\nSeed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
