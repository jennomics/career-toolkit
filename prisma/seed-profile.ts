import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "No database URL found. Set POSTGRES_URL or POSTGRES_PRISMA_URL in .env"
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding candidate profile...");

  // Delete existing profile data
  await prisma.candidateProfile.deleteMany();

  const profile = await prisma.candidateProfile.create({
    data: {
      name: "Jenna Lang, PhD",
      location: "Sacramento, CA",
      phone: "916-690-5889",
      email: "jennomics@gmail.com",
      linkedin: "linkedin.com/in/jennalang",
      github: "github.com/jennomics",
      currentTitle: "Senior Director, DNA Science R&D — AncestryDNA",
      reportsTo: "Head of Product",
      positioningStatements: [
        "I build decision environments — data platforms architected around the decisions they need to power, not around how data is easiest to store.",
        "I think big without losing operational grip. I connect what most organizations keep separate — wet lab biology, cloud-scale engineering, AI, regulatory reality, and executive strategy.",
        "20 years of building data infrastructure where the biology is complex, the data are vast, and the stakes are identity and human health.",
      ],
      selfDescribedStrengths: [
        "Translating between science and business",
        "Building teams that ship",
        "Making complexity legible to executives",
        "Finding the 80/20 in ambiguous problem spaces",
        "Staying calm in high-stakes moments",
        "Writing clearly and persuasively",
      ],
      technicalInventory:
        "Nextflow, AWS (Batch, S3, Step Functions, Lambda), Python, R, SQL, Terraform, Docker, " +
        "GitHub Actions, Airflow, Spark, genomics pipelines (WGS, microarray, imputation), " +
        "ML/AI (random forests, neural nets, LLMs), population genetics, statistical genetics, " +
        "Agile/Scrum, OKRs, data governance, LIMS",
      educationCredentials:
        "PhD, Genetics — University of California, Davis (2009)\n" +
        "BS, Biology (Genetics emphasis) — University of California, Davis (2001)",
      recognitionPresence:
        "15+ peer-reviewed publications in population genetics and genomics\n" +
        "Invited speaker at ASHG, ISBA, and internal Ancestry tech talks\n" +
        "Led team that won internal Ancestry innovation award for PetDNA prototype",
      operatingPrinciples: [
        "Ship, then iterate. Perfect is the enemy of done.",
        "Make the implicit explicit. Document decisions and their context.",
        "Hire for slope, not intercept.",
        "Every meeting should have an artifact.",
        "If it is not in the backlog, it is not real.",
        "Protect the team from chaos above so they can focus below.",
        "Data without a decision framework is just noise.",
        "Disagree and commit. Once the call is made, execute fully.",
      ],
      writingStyle:
        "Direct, structured, evidence-first. Favors short sentences and active voice. " +
        "Uses analogies to bridge domains. Comfortable with technical depth but always " +
        "connects back to business impact. Avoids jargon when writing for executives.",
      selfDescribedPosture:
        "Confident but not arrogant. Leads with curiosity. Acknowledges uncertainty " +
        "while still being decisive. Comfortable saying 'I don't know yet, but here's " +
        "how I'd find out.'",
      searchTargetLevel: "VP / SVP of Engineering, Data, or Product",
      searchGeography: "Remote-first, open to Sacramento/SF Bay Area hybrid",
      searchCompanies: [
        "Anthropic",
        "Stripe",
        "Figma",
        "Notion",
        "Vercel",
        "Databricks",
        "Scale AI",
        "Watershed",
        "Color Health",
        "Tempus",
      ],
      searchFirms: [
        "True Search",
        "Riviera Partners",
        "Daversa Partners",
      ],
      resumeOperatingRules: [
        "Never use 'passionate' or 'leverage' — find a more specific verb.",
        "Every bullet must have a measurable outcome or clear scope indicator.",
        "Lead with the result, then explain the action.",
        "Keep bullets to 1-2 lines. If it needs more, it is two bullets.",
        "Use the language of the target role, not the language of the current role.",
        "Titles should reflect actual authority, not just HR labels.",
        "Do not list technologies unless they are directly relevant to the target role.",
        "Positioning statement goes above the fold. It is the first thing they read.",
      ],
      knownGaps:
        "No direct experience with B2B SaaS sales cycles or PLG motions. " +
        "Academic publication record stopped in 2018 after moving to industry leadership. " +
        "Limited public speaking outside genomics conferences. " +
        "No formal management training (learned on the job).",
      personalBackground:
        "Lives in Sacramento with partner and two kids (8, 11). Runs half-marathons. " +
        "Reads science fiction and organizational behavior books. Volunteers at local " +
        "science museum. Grew up on a farm in Central California.",

      careerRoles: {
        create: [
          {
            period: "2022 - present",
            organization: "AncestryDNA",
            title: "Senior Director, DNA Science R&D",
            scope: "45-person org spanning computational biology, data engineering, ML, and lab science",
            highlights: [
              "Led AI transformation initiative replacing 12 legacy models with unified LLM-augmented pipeline",
              "Reduced ethnicity estimate computation time from 48hrs to 3hrs through architecture redesign",
              "Built and shipped SideView 2.0 (parental inheritance) to 25M+ customers",
              "Managed $12M annual budget across cloud infrastructure and headcount",
              "Established OKR framework adopted across all of Product Engineering",
            ],
            sortOrder: 1,
          },
          {
            period: "2019 - 2022",
            organization: "AncestryDNA",
            title: "Director, Computational Biology",
            scope: "20-person team, full pipeline ownership from sample to customer-facing results",
            highlights: [
              "Migrated all production pipelines from on-prem HPC to AWS (Nextflow + Batch)",
              "Delivered Communities feature matching users to 1,200+ genetic communities",
              "Reduced pipeline costs by 60% through spot instance strategy and architecture optimization",
              "Hired and developed 8 senior engineers and scientists during rapid growth phase",
            ],
            sortOrder: 2,
          },
          {
            period: "2016 - 2019",
            organization: "AncestryDNA",
            title: "Senior Manager, Science Engineering",
            scope: "12-person team bridging research science and production engineering",
            highlights: [
              "Created PetDNA prototype that became a new product line (now Wisdom Panel partnership)",
              "Built internal tool for ethnicity reference panel curation, reducing cycle time from months to weeks",
              "Established engineering standards for reproducible science (containers, version control, CI/CD)",
            ],
            sortOrder: 3,
          },
          {
            period: "2014 - 2016",
            organization: "AncestryDNA",
            title: "Staff Scientist, Population Genetics",
            scope: "Individual contributor driving core algorithm development",
            highlights: [
              "Developed improved ethnicity estimation algorithm used by 20M+ customers",
              "Published 3 peer-reviewed papers on methods for genetic ancestry inference",
              "Built prototype for DNA matching confidence scoring still in production today",
            ],
            sortOrder: 4,
          },
          {
            period: "2012 - 2014",
            organization: "UC Davis Genome Center",
            title: "Postdoctoral Researcher",
            scope: "Independent research on population genomics of adaptation",
            highlights: [
              "Led computational analysis of 1,000+ whole genomes for adaptation study",
              "Developed novel statistical methods for detecting selection in structured populations",
              "Mentored 3 graduate students in computational methods",
            ],
            sortOrder: 5,
          },
          {
            period: "2009 - 2012",
            organization: "UC Davis",
            title: "Postdoctoral Scholar, Genetics",
            scope: "Population genetics of maize domestication and adaptation",
            highlights: [
              "Published landmark paper on convergent adaptation in maize and teosinte",
              "Built one of the first cloud-based (EC2) genomics analysis pipelines in the lab",
              "Managed lab computational infrastructure and trained students in bioinformatics",
            ],
            sortOrder: 6,
          },
          {
            period: "2004 - 2009",
            organization: "UC Davis",
            title: "PhD Candidate, Genetics",
            scope: "Dissertation on population genetics of highland adaptation in maize",
            highlights: [
              "Completed PhD in 5 years with 4 first-author publications",
              "Awarded NSF Graduate Research Fellowship",
              "Teaching assistant for genetics and evolution courses (8 quarters)",
            ],
            sortOrder: 7,
          },
          {
            period: "2001 - 2004",
            organization: "UC Davis Genome Center",
            title: "Research Associate",
            scope: "Lab technician supporting multiple research projects",
            highlights: [
              "Managed high-throughput genotyping facility processing 10K+ samples/month",
              "Automated DNA extraction protocols reducing hands-on time by 50%",
              "Co-authored 2 papers on rice genetics",
            ],
            sortOrder: 8,
          },
          {
            period: "2001",
            organization: "DOE Joint Genome Institute (JGI)",
            title: "Intern, Sequencing Group",
            scope: "Summer internship in production sequencing",
            highlights: [
              "First exposure to large-scale data processing and pipeline thinking",
              "Assisted with quality control for human genome sequencing project",
            ],
            sortOrder: 9,
          },
        ],
      },

      signatureStories: {
        create: [
          {
            title: "Nextflow Migration",
            situation:
              "AncestryDNA's production genomics pipelines ran on aging on-prem HPC cluster with 2-week queue times and no reproducibility guarantees.",
            obstacle:
              "Team had never used cloud infrastructure. HPC admins resistant to change. No budget allocated for migration. Production SLAs could not slip during transition.",
            action:
              "Built business case showing $2M/year savings. Ran 3-month proof-of-concept on AWS Batch with Nextflow. Trained team through pair programming. Ran both systems in parallel for 6 weeks.",
            result:
              "Full migration completed in 9 months. Pipeline costs down 60%. Processing time from 48hrs to 3hrs. Zero production incidents during transition. Team now cloud-native.",
            whyItMatters:
              "Demonstrates ability to drive large infrastructure transformation while maintaining production stability and bringing a skeptical team along.",
          },
          {
            title: "PetDNA",
            situation:
              "Ancestry had no presence in pet genetics market but had relevant infrastructure and 20M customer base interested in 'DNA for everything.'",
            obstacle:
              "No budget, no headcount, no executive sponsor. Pet genetics requires different reference panels and breed databases that didn't exist internally.",
            action:
              "Built prototype on 20% time with 2 engineers. Partnered with external breed database. Demoed to SVP Product at internal hackathon. Won innovation award and seed funding.",
            result:
              "Prototype became partnership with Wisdom Panel. Generated incremental revenue stream. Demonstrated team's ability to innovate outside core mission.",
            whyItMatters:
              "Shows entrepreneurial instinct within large org. Ability to create something from nothing, find partners, and navigate organizational politics to get buy-in.",
          },
          {
            title: "AI Transformation",
            situation:
              "AncestryDNA had 12 separate ML models (each owned by different scientists) producing ethnicity estimates, health risk scores, and trait predictions. Models were inconsistent, hard to update, and expensive to run.",
            obstacle:
              "Each model owner considered their model 'special.' No unified evaluation framework existed. Leadership wanted faster iteration but wouldn't fund a separate AI team.",
            action:
              "Proposed unified architecture with shared embedding layer and model-specific heads. Built evaluation harness that let scientists compare old vs new approaches fairly. Phased migration over 4 quarters. Used LLM augmentation for customer-facing explanations.",
            result:
              "Reduced model count from 12 to 3 unified systems. Cut inference costs 40%. Enabled weekly model updates (was quarterly). Customer satisfaction scores up 15% on explanation clarity.",
            whyItMatters:
              "Demonstrates ability to modernize ML infrastructure diplomatically while managing organizational change. Technical vision combined with people skills.",
          },
          {
            title: "SideView 2.0",
            situation:
              "Ancestry's parental inheritance feature (SideView) was popular but limited. V1 could only split ethnicity by parent. Customers wanted full family-line attribution.",
            obstacle:
              "Problem was computationally intractable at scale (25M customers). Required novel algorithm that didn't exist in literature. Marketing had already announced timeline.",
            action:
              "Assembled cross-functional tiger team (3 scientists, 2 engineers, 1 PM). Developed novel phasing approach using network of relatives. Built distributed compute layer on AWS Step Functions. Shipped iteratively - V2.0 with parent split, V2.1 with grandparent.",
            result:
              "Shipped on time to 25M customers. Processing at scale (full database in 72 hrs). 40% increase in customer engagement with ethnicity results. Featured in Ancestry's annual product keynote.",
            whyItMatters:
              "Shows ability to solve genuinely hard technical problems under deadline pressure while coordinating across science, engineering, product, and marketing.",
          },
          {
            title: "Ethnicity/Communities",
            situation:
              "Customers wanted more granular ethnicity results and connection to specific geographic communities their ancestors came from.",
            obstacle:
              "Required assembling reference panels for 1,200+ communities worldwide. Data quality varied enormously. Sensitivity around identity and representation required careful governance.",
            action:
              "Built systematic reference panel curation pipeline. Established diversity advisory board for community naming. Created automated QC that flagged representation gaps. Phased rollout starting with well-characterized regions.",
            result:
              "Launched 1,200+ communities worldwide. Became top-cited feature in customer acquisition. Reduced support tickets about ethnicity accuracy by 30%.",
            whyItMatters:
              "Demonstrates combining technical scale with ethical sensitivity. Building governance processes that enable speed rather than blocking it.",
          },
        ],
      },

      profileMetrics: {
        create: [
          { label: "Team size (current)", value: "45 people", source: "Direct reports + full org" },
          { label: "Budget responsibility", value: "$12M annually", source: "Cloud + headcount" },
          { label: "Customers impacted", value: "25M+", source: "AncestryDNA active users" },
          { label: "Pipeline cost reduction", value: "60%", source: "AWS migration project" },
          { label: "Processing time improvement", value: "48hrs to 3hrs", source: "Ethnicity compute pipeline" },
          { label: "ML model consolidation", value: "12 to 3 systems", source: "AI transformation initiative" },
          { label: "Inference cost reduction", value: "40%", source: "Unified ML architecture" },
          { label: "Customer engagement lift", value: "40%", source: "SideView 2.0 launch" },
          { label: "Genetic communities shipped", value: "1,200+", source: "Communities feature" },
          { label: "Support ticket reduction", value: "30%", source: "Ethnicity accuracy improvements" },
          { label: "Publications", value: "15+ peer-reviewed", source: "Google Scholar" },
          { label: "Engineers hired and developed", value: "8 senior hires", source: "2019-2022 growth phase" },
          { label: "Years in genomics/data", value: "20+", source: "Career span 2001-present" },
          { label: "Genotyping throughput managed", value: "10K+ samples/month", source: "Early career lab management" },
          { label: "PhD completion time", value: "5 years (at-pace)", source: "UC Davis 2004-2009" },
          { label: "Migration zero-downtime", value: "0 production incidents", source: "Cloud migration transition" },
          { label: "Model update frequency improvement", value: "Quarterly to weekly", source: "Unified ML platform" },
          { label: "Customer satisfaction improvement", value: "15%", source: "Explanation clarity via LLM" },
          { label: "Full database processing time", value: "72 hours", source: "SideView 2.0 at scale" },
          { label: "NSF fellowship", value: "Graduate Research Fellowship", source: "PhD funding 2004" },
        ],
      },

      unresolvedItems: {
        create: [
          {
            section: "Positioning",
            description: "Lead with technical depth or leadership breadth?",
            optionA: "Lead with '20 years building data infrastructure' (technical authority)",
            optionB: "Lead with '45-person org, $12M budget' (executive scale)",
            priority: "high",
          },
          {
            section: "Career Narrative",
            description: "Frame career as scientist-turned-leader or always-been-a-builder?",
            optionA: "Emphasize the PhD-to-VP trajectory (unusual and compelling)",
            optionB: "Emphasize the consistent thread of building systems (more cohesive)",
            priority: "high",
          },
          {
            section: "Target Role",
            description: "VP Engineering or VP Data/AI as primary target?",
            optionA: "VP Engineering (broader scope, more roles available)",
            optionB: "VP Data/AI (stronger differentiation, fewer but better-fit roles)",
            priority: "high",
          },
          {
            section: "Resume Format",
            description: "Include publications section or fold into experience bullets?",
            optionA: "Separate publications section (academic credibility signal)",
            optionB: "Fold into experience bullets (saves space, keeps focus on impact)",
            priority: "medium",
          },
          {
            section: "Early Career",
            description: "How much pre-Ancestry detail to include?",
            optionA: "Full detail on postdoc and PhD (shows depth of expertise)",
            optionB: "One-line summary for pre-2014 (keeps focus on leadership era)",
            priority: "medium",
          },
          {
            section: "Skills Section",
            description: "Include specific technologies or keep abstract?",
            optionA: "List technologies (Nextflow, AWS, Python etc.) for ATS matching",
            optionB: "Use capability categories (cloud architecture, ML systems) for seniority signal",
            priority: "medium",
          },
          {
            section: "PetDNA Story",
            description: "Include PetDNA story or replace with something more enterprise-relevant?",
            optionA: "Keep PetDNA (shows entrepreneurial initiative and creativity)",
            optionB: "Replace with Communities governance story (shows enterprise judgment)",
            priority: "low",
          },
          {
            section: "Personal Section",
            description: "Include personal interests or keep strictly professional?",
            optionA: "Include brief personal section (humanizes, memorable)",
            optionB: "Omit personal section (more space for professional content)",
            priority: "low",
          },
        ],
      },

      writingSamples: {
        create: [
          {
            title: "Cover Letter - Anthropic",
            context: "Written for Principal Product Manager role, demonstrating voice and positioning",
            content: `Dear Anthropic Hiring Team,

I build decision environments. For 20 years, I've architected data platforms not around how data is easiest to store, but around the decisions they need to power. At AncestryDNA, that meant building systems where 25 million people discover who they are. The decisions were identity-level: "Where did my family come from?" "Who am I related to?" "What health risks did I inherit?"

Now I want to build decision environments for a different kind of intelligence.

What I bring to Anthropic:

I've led a 45-person R&D org through an AI transformation — replacing 12 legacy ML models with a unified, LLM-augmented architecture. I know what it takes to make AI systems reliable at scale, not just impressive in demos. I've shipped AI features to 25M users where the stakes are personal identity, and I've built the governance frameworks that let you move fast without breaking trust.

I think big without losing operational grip. I connect what most organizations keep separate: deep technical systems, customer experience, regulatory reality, and executive strategy. I've managed $12M budgets, hired and developed senior teams, and shipped products that customers actually use — not just ones that pass internal review.

Why now, why Anthropic:

The problems you're solving — making AI systems that are genuinely helpful, honest, and harmless — require exactly the kind of thinking I've spent my career developing: rigorous science married to product instinct, systems thinking married to human empathy, and the operational discipline to ship safely at scale.

I'd love to discuss how my experience building trustworthy AI systems at scale could contribute to Anthropic's mission.

Best,
Jenna Lang, PhD`,
          },
        ],
      },
    },
  });

  const counts = await Promise.all([
    prisma.careerRole.count({ where: { profileId: profile.id } }),
    prisma.signatureStory.count({ where: { profileId: profile.id } }),
    prisma.profileMetric.count({ where: { profileId: profile.id } }),
    prisma.unresolvedItem.count({ where: { profileId: profile.id } }),
    prisma.writingSample.count({ where: { profileId: profile.id } }),
  ]);

  console.log(`Created profile: ${profile.name} (${profile.id})`);
  console.log(`  - ${counts[0]} career roles`);
  console.log(`  - ${counts[1]} signature stories`);
  console.log(`  - ${counts[2]} metrics`);
  console.log(`  - ${counts[3]} unresolved items`);
  console.log(`  - ${counts[4]} writing samples`);
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
