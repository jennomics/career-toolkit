import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DEMO_DATABASE_URL;
if (!connectionString) {
  console.error("DEMO_DATABASE_URL is required for the demo seed. Set it in your environment.");
  process.exit(1);
}
const privateUrls = [process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL, process.env.DATABASE_URL].filter(Boolean);
if (privateUrls.includes(connectionString)) {
  console.error("DEMO_DATABASE_URL must be different from your private database URL.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding demo candidate profile (fictional persona)...");

  // Delete existing profile data
  await prisma.candidateProfile.deleteMany();

  const profile = await prisma.candidateProfile.create({
    data: {
      name: "Dr. Morgan Chen",
      location: "Portland, OR",
      phone: "555-012-3456",
      email: "morgan.chen@genomicalabs.example.com",
      linkedin: "linkedin.com/in/morganchen-fictional",
      github: "github.com/morganchen-demo",
      currentTitle: "VP of Engineering, Data Platforms - Genomica Labs",
      reportsTo: "CTO",
      positioningStatements: [
        "I build data platforms that turn messy biological signals into clear product decisions - not just storing data, but making it actionable.",
        "I bridge deep technical execution with business strategy: genomics pipelines, cloud architecture, ML systems, and executive communication all in one person.",
        "18 years of scaling data infrastructure where the science is complex, the datasets are massive, and the outcomes directly affect people's lives.",
      ],
      selfDescribedStrengths: [
        "Translating between science teams and business stakeholders",
        "Building cross-functional teams that deliver on aggressive timelines",
        "Making complex technical tradeoffs legible to executives",
        "Finding the highest-leverage intervention in ambiguous problem spaces",
        "Staying composed when production is on fire",
        "Writing clear technical proposals and decision documents",
      ],
      technicalInventory:
        "Nextflow, AWS (Batch, S3, Step Functions, Lambda, EKS), Python, Go, SQL, Terraform, Docker, " +
        "GitHub Actions, Airflow, Spark, genomics pipelines (WGS, RNA-seq, variant calling), " +
        "ML/AI (gradient boosting, transformers, LLMs), bioinformatics, distributed systems, " +
        "Agile/Scrum, OKRs, data governance, LIMS",
      educationCredentials:
        "PhD, Computational Biology - Stanford University (2010)\n" +
        "BS, Computer Science & Biology (double major) - University of Washington (2005)",
      recognitionPresence:
        "12+ peer-reviewed publications in computational genomics\n" +
        "Keynote speaker at BioIT World and internal Genomica engineering summits\n" +
        "Led team that won Genomica internal innovation award for real-time variant calling prototype",
      operatingPrinciples: [
        "Ship, then iterate. Done is better than perfect.",
        "Write it down. If the decision is not documented, it did not happen.",
        "Hire for learning velocity, not just current skill.",
        "Every meeting ends with an action item.",
        "If it is not on the roadmap, it is not real work.",
        "Shield the team from organizational noise so they can focus on delivery.",
        "Data without a decision framework is just expensive storage.",
        "Disagree and commit. Once aligned, execute with full conviction.",
      ],
      writingStyle:
        "Direct, structured, evidence-first. Prefers short paragraphs and active voice. " +
        "Uses concrete examples to bridge technical and business audiences. Comfortable " +
        "going deep on architecture but always connects back to customer or business outcomes. " +
        "Avoids jargon in executive communications.",
      selfDescribedPosture:
        "Confident but curious. Leads with questions before assertions. Comfortable with " +
        "ambiguity while still driving toward decisions. Happy to say 'I do not know yet, " +
        "but here is how we will find out.'",
      searchTargetLevel: "VP / SVP of Engineering or Data",
      searchGeography: "Remote-first, open to Portland/Seattle/SF hybrid",
      searchCompanies: [
        "Helix Therapeutics",
        "NovaBio Systems",
        "Quantum Health",
        "DataWeave Corp",
        "Precision Dynamics",
        "Celleris",
        "BioForge AI",
        "CloudStrand",
        "Meridian Sciences",
        "Arclight Genomics",
      ],
      searchFirms: [
        "Apex Talent Partners",
        "Northstar Executive Search",
        "Pinnacle Recruiting Group",
      ],
      resumeOperatingRules: [
        "Never use 'passionate' or 'leverage' - find a more specific verb.",
        "Every bullet must have a measurable outcome or a clear scope indicator.",
        "Lead with the result, then explain the action.",
        "Keep bullets to 1-2 lines. If it needs more, split it.",
        "Use the language of the target role, not the language of the current role.",
        "Titles should reflect actual authority, not just HR labels.",
        "Do not list technologies unless directly relevant to the target role.",
        "Positioning statement goes above the fold. First thing they read.",
      ],
      knownGaps:
        "No direct experience with B2B SaaS go-to-market or PLG motions. " +
        "Publication output slowed after 2019 when fully in management. " +
        "Limited public speaking outside biotech conferences. " +
        "No formal executive coaching or leadership certificate programs.",
      personalBackground:
        "Lives in Portland with partner and a very energetic border collie. Runs trail ultramarathons. " +
        "Reads science fiction and systems thinking books. Volunteers at a local STEM mentoring " +
        "nonprofit. Grew up in suburban Vancouver, WA.",

      careerRoles: {
        create: [
          {
            period: "2021 - present",
            organization: "Genomica Labs",
            title: "VP of Engineering, Data Platforms",
            scope: "55-person org spanning bioinformatics, data engineering, ML infrastructure, and platform reliability",
            highlights: [
              "Led platform modernization replacing 8 legacy batch pipelines with unified streaming architecture",
              "Reduced variant calling compute time from 36hrs to 2hrs through distributed processing redesign",
              "Built and shipped RealTime Genomics product processing 50K+ samples/month for clinical partners",
              "Managed $15M annual budget across cloud infrastructure and team headcount",
              "Established engineering ladder and OKR framework adopted org-wide",
            ],
            sortOrder: 1,
          },
          {
            period: "2018 - 2021",
            organization: "Genomica Labs",
            title: "Senior Director, Bioinformatics Engineering",
            scope: "30-person team, full pipeline ownership from sequencer output to clinical-grade results",
            highlights: [
              "Migrated all production pipelines from on-prem HPC to AWS (Nextflow + EKS)",
              "Delivered Population Insights feature matching users to 800+ population clusters",
              "Reduced pipeline costs by 55% through spot instance strategy and container optimization",
              "Hired and developed 10 senior engineers during hypergrowth phase",
            ],
            sortOrder: 2,
          },
          {
            period: "2015 - 2018",
            organization: "Genomica Labs",
            title: "Director, Platform Engineering",
            scope: "15-person team bridging research science and production systems",
            highlights: [
              "Created real-time variant calling prototype that became a core product feature",
              "Built internal tool for reference panel curation reducing update cycles from months to days",
              "Established engineering standards for reproducible bioinformatics (containers, CI/CD, version control)",
            ],
            sortOrder: 3,
          },
          {
            period: "2013 - 2015",
            organization: "Genomica Labs",
            title: "Staff Engineer, Computational Genomics",
            scope: "Individual contributor driving core algorithm development",
            highlights: [
              "Developed improved population stratification algorithm processing 10M+ genotypes",
              "Published 3 peer-reviewed papers on scalable genomics methods",
              "Built prototype for sample QC scoring system still running in production",
            ],
            sortOrder: 4,
          },
          {
            period: "2010 - 2013",
            organization: "Pacific Northwest Genome Institute",
            title: "Postdoctoral Research Scientist",
            scope: "Independent research on computational methods for large-scale genomics",
            highlights: [
              "Led computational analysis of 2,000+ whole genomes for a multi-site collaboration",
              "Developed novel statistical methods for detecting structural variants in population data",
              "Mentored 4 graduate students in computational pipeline development",
            ],
            sortOrder: 5,
          },
          {
            period: "2005 - 2010",
            organization: "Stanford University",
            title: "PhD Candidate, Computational Biology",
            scope: "Dissertation on scalable algorithms for population genomics",
            highlights: [
              "Completed PhD in 5 years with 5 first-author publications",
              "Awarded NIH Computational Biology Training Grant",
              "Teaching assistant for algorithms and genomics courses (6 quarters)",
            ],
            sortOrder: 6,
          },
        ],
      },

      signatureStories: {
        create: [
          {
            title: "Cloud Migration",
            situation:
              "Genomica's production genomics pipelines ran on aging on-prem HPC cluster with multi-day queue times and no reproducibility guarantees.",
            obstacle:
              "Team had limited cloud experience. HPC admins were resistant to change. No dedicated migration budget. Clinical SLAs could not slip during transition.",
            action:
              "Built business case demonstrating $3M/year savings. Ran 4-month proof-of-concept on AWS with Nextflow + EKS. Trained team through pair programming and internal workshops. Operated both systems in parallel for 8 weeks.",
            result:
              "Full migration completed in 11 months. Pipeline costs down 55%. Processing time from 36hrs to 2hrs. Zero clinical SLA violations during transition. Team now fully cloud-native.",
            whyItMatters:
              "Demonstrates ability to drive large infrastructure transformation while maintaining production stability and bringing a skeptical team along.",
          },
          {
            title: "Real-Time Variant Calling",
            situation:
              "Genomica had no real-time processing capability but clinical partners needed same-day turnaround for actionable variants.",
            obstacle:
              "No budget, no headcount, no executive sponsor initially. Real-time genomics requires fundamentally different architecture than batch processing.",
            action:
              "Built prototype on innovation time with 3 engineers. Partnered with a clinical site for validation data. Demoed to SVP Product at quarterly review. Won innovation award and seed funding for production buildout.",
            result:
              "Prototype became core product feature processing 50K+ samples/month. Generated new clinical revenue stream. Demonstrated team's ability to innovate under constraints.",
            whyItMatters:
              "Shows entrepreneurial instinct within a growth-stage company. Ability to create something from nothing, find partners, and navigate organization to secure investment.",
          },
          {
            title: "Platform Unification",
            situation:
              "Genomica had 8 separate batch pipelines (each owned by different science teams) for variant calling, QC, annotation, and reporting. Pipelines were inconsistent, hard to update, and expensive to run.",
            obstacle:
              "Each pipeline owner considered their system 'special.' No unified evaluation framework existed. Leadership wanted faster iteration but was reluctant to fund a platform rewrite.",
            action:
              "Proposed unified streaming architecture with shared preprocessing and pipeline-specific analysis stages. Built comparison harness for side-by-side evaluation. Phased migration over 5 quarters. Added ML-based quality prediction to catch issues pre-delivery.",
            result:
              "Reduced pipeline count from 8 to 2 unified systems. Cut compute costs 45%. Enabled daily pipeline updates (was monthly). Error escape rate down 70%.",
            whyItMatters:
              "Demonstrates ability to modernize core infrastructure while managing organizational change. Technical vision combined with stakeholder management.",
          },
          {
            title: "RealTime Genomics Launch",
            situation:
              "Clinical partners needed same-day turnaround for pharmacogenomics results. The batch system took 36 hours minimum and could not be accelerated further.",
            obstacle:
              "Problem required fundamentally new architecture. Regulatory requirements for clinical-grade results added complexity. Sales had already committed timelines to partners.",
            action:
              "Assembled cross-functional team (4 engineers, 2 scientists, 1 regulatory specialist). Designed distributed processing on AWS Step Functions. Built validation framework satisfying clinical accuracy requirements. Shipped iteratively - Phase 1 with core variants, Phase 2 with full pharmacogenomics panel.",
            result:
              "Shipped on time processing 50K+ samples/month. Clinical accuracy at 99.97%. 3 new enterprise partners signed based on capability. Featured in company's annual product announcement.",
            whyItMatters:
              "Shows ability to solve genuinely hard technical problems under deadline pressure while coordinating across engineering, science, regulatory, and sales.",
          },
          {
            title: "Population Insights",
            situation:
              "Customers wanted to understand their genomic data in population context - how their variants compared to reference populations worldwide.",
            obstacle:
              "Required assembling reference panels for 800+ populations. Data quality varied enormously. Sensitivity around ethnic classification required careful governance.",
            action:
              "Built systematic reference panel curation pipeline. Established diversity advisory group for population naming. Created automated QC that flagged representation gaps. Phased rollout starting with well-characterized populations.",
            result:
              "Launched 800+ population clusters. Became highest-engagement feature for consumer product. Reduced support tickets about result accuracy by 35%.",
            whyItMatters:
              "Demonstrates combining technical scale with ethical sensitivity. Building governance processes that enable velocity rather than blocking it.",
          },
        ],
      },

      profileMetrics: {
        create: [
          { label: "Team size (current)", value: "55 people", source: "Direct reports + full org" },
          { label: "Budget responsibility", value: "$15M annually", source: "Cloud + headcount" },
          { label: "Samples processed monthly", value: "50K+", source: "RealTime Genomics product" },
          { label: "Pipeline cost reduction", value: "55%", source: "Cloud migration project" },
          { label: "Processing time improvement", value: "36hrs to 2hrs", source: "Variant calling pipeline" },
          { label: "Pipeline consolidation", value: "8 to 2 systems", source: "Platform unification initiative" },
          { label: "Compute cost reduction", value: "45%", source: "Unified streaming architecture" },
          { label: "Clinical accuracy", value: "99.97%", source: "RealTime Genomics validation" },
          { label: "Population clusters shipped", value: "800+", source: "Population Insights feature" },
          { label: "Support ticket reduction", value: "35%", source: "Result accuracy improvements" },
          { label: "Publications", value: "12+ peer-reviewed", source: "Google Scholar" },
          { label: "Senior engineers hired", value: "10 during hypergrowth", source: "2018-2021 scaling phase" },
          { label: "Years in genomics/data", value: "18+", source: "Career span 2005-present" },
          { label: "Genomes analyzed", value: "2,000+ WGS", source: "Postdoc research collaboration" },
          { label: "PhD completion time", value: "5 years (on track)", source: "Stanford 2005-2010" },
          { label: "Migration zero-downtime", value: "0 SLA violations", source: "Cloud migration transition" },
          { label: "Pipeline update frequency improvement", value: "Monthly to daily", source: "Unified platform" },
          { label: "Error escape reduction", value: "70%", source: "ML-based quality prediction" },
          { label: "Enterprise partners signed", value: "3 new", source: "RealTime Genomics launch" },
          { label: "NIH training grant", value: "Computational Biology Training Grant", source: "PhD funding 2005" },
        ],
      },

      unresolvedItems: {
        create: [
          {
            section: "Positioning",
            description: "Lead with technical depth or leadership breadth?",
            optionA: "Lead with '18 years building data infrastructure' (technical authority)",
            optionB: "Lead with '55-person org, $15M budget' (executive scale)",
            priority: "high",
          },
          {
            section: "Career Narrative",
            description: "Frame career as scientist-turned-leader or always-been-a-builder?",
            optionA: "Emphasize the PhD-to-VP trajectory (unusual and compelling)",
            optionB: "Emphasize the consistent thread of building platforms (more cohesive)",
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
            description: "How much pre-Genomica detail to include?",
            optionA: "Full detail on postdoc and PhD (shows depth of expertise)",
            optionB: "One-line summary for pre-2013 (keeps focus on leadership era)",
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
            section: "Real-Time Story",
            description: "Include prototype origin story or lead with production scale?",
            optionA: "Keep prototype narrative (shows entrepreneurial initiative)",
            optionB: "Lead with production scale (shows enterprise judgment)",
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
            title: "Cover Letter - Helix Therapeutics",
            context: "Written for VP Engineering role, demonstrating voice and positioning",
            content: `Dear Helix Therapeutics Hiring Team,

I build data platforms that turn messy biological signals into clear product decisions. For 18 years, I have architected systems not around how data is easiest to store, but around the decisions they need to power. At Genomica Labs, that means building infrastructure where 50,000+ clinical samples per month get processed with 99.97% accuracy. The decisions are health-level: "What variants matter?" "What should the clinician act on?" "How confident are we?"

Now I want to build decision infrastructure for therapeutic development.

What I bring to Helix:

I have led a 55-person engineering org through a complete platform modernization - replacing 8 legacy batch pipelines with a unified streaming architecture. I know what it takes to make genomics systems reliable at clinical scale, not just functional in a research setting. I have shipped products processing tens of thousands of samples monthly where accuracy is non-negotiable, and I have built the governance frameworks that let you move fast without compromising quality.

I think big without losing operational grip. I connect what most organizations keep separate: deep bioinformatics, cloud-scale engineering, ML/AI systems, regulatory reality, and executive strategy. I have managed $15M budgets, built and developed senior teams, and shipped products that clinical partners rely on daily.

Why now, why Helix:

The problems you are solving - making genomics actionable for therapeutic development - require exactly the kind of thinking I have spent my career developing: rigorous science married to platform engineering, systems thinking married to clinical empathy, and the operational discipline to ship reliably at scale.

I would welcome the chance to discuss how my experience building clinical-grade genomics platforms could accelerate Helix's mission.

Best,
Dr. Morgan Chen`,
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
