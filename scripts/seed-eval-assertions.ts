import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL is required for the eval assertions seed. Set it in your environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Tier 1 regression assertions from requirements.md.
 * These are hard-coded facts that must always (or never) appear in generated output.
 */
const TIER_1_ASSERTIONS: Array<{
  tier: number;
  assertType: string;
  target: string;
  documentTypes: string[];
}> = [
  {
    tier: 1,
    assertType: "contains",
    target: "linkedin.com/in/jennomics",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "not-contains",
    target: "jennalang",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "contains",
    target: "30 million customer genomes",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "not-contains",
    target: "proprietary sequences",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "not-contains",
    target: "genotype database",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "not-contains",
    target: "human genomes",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "not-contains",
    target: "fifteen years",
    documentTypes: [],
  },
  {
    tier: 1,
    assertType: "not-contains",
    target: "securing",
    documentTypes: [],
  },
];

async function main() {
  console.log("Seeding Tier 1 eval assertions...\n");

  let created = 0;
  let skipped = 0;

  for (const assertion of TIER_1_ASSERTIONS) {
    // Idempotent: check if an assertion with the same tier+assertType+target already exists
    const existing = await prisma.evalAssertion.findFirst({
      where: {
        tier: assertion.tier,
        assertType: assertion.assertType,
        target: assertion.target,
      },
    });

    if (existing) {
      skipped++;
      console.log(`  Skipped (exists): [${assertion.assertType}] "${assertion.target}"`);
      continue;
    }

    await prisma.evalAssertion.create({
      data: {
        tier: assertion.tier,
        assertType: assertion.assertType,
        target: assertion.target,
        documentTypes: assertion.documentTypes,
        active: true,
      },
    });

    created++;
    console.log(`  Created: [${assertion.assertType}] "${assertion.target}"`);
  }

  const total = await prisma.evalAssertion.count();
  console.log(`\nDone! ${created} created, ${skipped} skipped. Total assertions: ${total}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
