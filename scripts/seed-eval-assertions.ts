import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("POSTGRES_URL is required for the eval assertions seed. Set it in your environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Tier 1 regression assertions are loaded from scripts/eval-assertions.json.
 * This file is in .gitignore and must be created locally from the example file.
 * See scripts/eval-assertions.example.json for the required structure.
 */
interface AssertionEntry {
  tier: number;
  assertType: string;
  target: string;
  documentTypes: string[];
}

function loadAssertions(): AssertionEntry[] {
  const assertionsPath = resolve(__dirname, "eval-assertions.json");

  if (!existsSync(assertionsPath)) {
    console.error(
      "Error: scripts/eval-assertions.json not found.\n" +
      "Copy scripts/eval-assertions.example.json to scripts/eval-assertions.json\n" +
      "and fill in the actual assertion values before running this script."
    );
    process.exit(1);
  }

  const raw = readFileSync(assertionsPath, "utf-8");
  const data = JSON.parse(raw) as AssertionEntry[];

  if (!Array.isArray(data) || data.length === 0) {
    console.error("Error: scripts/eval-assertions.json must contain a non-empty array of assertions.");
    process.exit(1);
  }

  return data;
}

async function main() {
  console.log("Seeding Tier 1 eval assertions...\n");

  const assertions = loadAssertions();
  let created = 0;
  let skipped = 0;

  for (const assertion of assertions) {
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
