import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL is required for the claims seed. Set it in your environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Slugify a label string for use as part of a claimKey.
 * e.g. "Team size (current)" -> "team-size-current"
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Map ExperienceHighlight category to Claim category.
 */
function mapHighlightCategory(highlightCategory: string): string {
  switch (highlightCategory) {
    case "achievement":
    case "project":
      return "capability";
    case "responsibility":
      return "narrative";
    default:
      return "capability";
  }
}

/**
 * Import ProfileMetric rows into Claims with category "numeric".
 */
async function importFromProfileMetrics() {
  const metrics = await prisma.profileMetric.findMany();
  console.log(`Found ${metrics.length} profile metrics to process...`);

  let created = 0;
  let skipped = 0;

  for (const metric of metrics) {
    const claimKey = `metric-${slugify(metric.label)}`;

    // Idempotent: skip if claim with this claimKey already exists
    const existing = await prisma.claim.findFirst({
      where: { claimKey },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const statement = `${metric.label}: ${metric.value}`;

    await prisma.claim.create({
      data: {
        claimKey,
        statement,
        category: "numeric",
        status: "unverified",
        artifacts: {
          create: {
            passageText: metric.value,
            passageLocation: metric.source || undefined,
          },
        },
      },
    });

    created++;
  }

  console.log(`  Profile metrics: ${created} created, ${skipped} skipped (already exist)`);
}

/**
 * Import ExperienceHighlight rows into Claims with category based on highlight category.
 */
async function importFromExperienceHighlights() {
  const highlights = await prisma.experienceHighlight.findMany();
  console.log(`Found ${highlights.length} experience highlights to process...`);

  let created = 0;
  let skipped = 0;

  for (const highlight of highlights) {
    const claimKey = `highlight-${slugify(highlight.text).slice(0, 80)}-${highlight.id.slice(-8)}`;

    // Idempotent: skip if claim with this claimKey already exists
    const existing = await prisma.claim.findFirst({
      where: { claimKey },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const category = mapHighlightCategory(highlight.category);

    await prisma.claim.create({
      data: {
        claimKey,
        statement: highlight.text,
        category,
        status: "unverified",
        artifacts: {
          create: {
            passageText: highlight.text,
            passageLocation: highlight.metrics || undefined,
          },
        },
      },
    });

    created++;
  }

  console.log(`  Experience highlights: ${created} created, ${skipped} skipped (already exist)`);
}

async function main() {
  console.log("Seeding claims from existing profile data...\n");

  await importFromProfileMetrics();
  await importFromExperienceHighlights();

  const totalClaims = await prisma.claim.count();
  const totalArtifacts = await prisma.claimArtifact.count();

  console.log(`\nDone! Total claims: ${totalClaims}, total artifacts: ${totalArtifacts}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
