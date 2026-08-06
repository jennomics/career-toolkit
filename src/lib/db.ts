import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getConnectionString(): string {
  const isDemoMode = process.env.DEMO_MODE === "true";

  if (isDemoMode) {
    // Demo mode: MUST use a separate demo database to protect real data
    const demoUrl = process.env.DEMO_DATABASE_URL;
    if (!demoUrl) {
      throw new Error(
        "DEMO_MODE is enabled but DEMO_DATABASE_URL is not set. " +
        "A separate demo database is required to prevent serving real data. " +
        "Set DEMO_DATABASE_URL to a PostgreSQL connection string for the demo database."
      );
    }

    // Verify DEMO_DATABASE_URL is not the same as any private database URL
    const privateUrls = [
      process.env.POSTGRES_URL,
      process.env.POSTGRES_PRISMA_URL,
      process.env.DATABASE_URL,
    ].filter(Boolean);
    if (privateUrls.includes(demoUrl)) {
      throw new Error(
        "DEMO_DATABASE_URL must be different from your private database URL. " +
        "Using the same URL would expose real data in demo mode."
      );
    }

    return demoUrl;
  }

  // Normal mode: use primary PostgreSQL connection
  const candidates = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL,
  ];

  const connectionString = candidates.find(
    (url) => url && url.startsWith("postgres")
  );

  if (!connectionString) {
    throw new Error(
      "No PostgreSQL connection URL found. Set POSTGRES_URL or POSTGRES_PRISMA_URL in .env. " +
      "(DATABASE_URL is set to a SQLite path which is not supported - remove or replace it.)"
    );
  }

  return connectionString;
}

function createPrismaClient() {
  const connectionString = getConnectionString();

  // Suppress pg SSL deprecation warning by explicitly setting sslmode=verify-full
  // (which is the current default behavior anyway)
  let finalUrl = connectionString;
  if (finalUrl.includes("sslmode=require") || (finalUrl.includes("ssl=") && !finalUrl.includes("sslmode=verify-full"))) {
    finalUrl = finalUrl.replace(/sslmode=require/g, "sslmode=verify-full");
  } else if (finalUrl.includes("?") && !finalUrl.includes("sslmode=")) {
    finalUrl += "&sslmode=verify-full";
  } else if (!finalUrl.includes("?") && !finalUrl.includes("sslmode=")) {
    finalUrl += "?sslmode=verify-full";
  }

  const adapter = new PrismaPg({ connectionString: finalUrl });
  return new PrismaClient({ adapter });
}

/**
 * Lazy-initialized Prisma client.
 * Uses a getter so the client is only created when first accessed at runtime,
 * not during Next.js build-time static page generation.
 *
 * In DEMO_MODE, connects to DEMO_DATABASE_URL (fails fast if not set).
 * In normal mode, connects to POSTGRES_URL / POSTGRES_PRISMA_URL.
 */
export const db = {
  get client(): PrismaClient {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  },
};

/**
 * Default export for convenience - use `prisma.job.findMany()` etc.
 * This is a Proxy that lazily initializes on first property access.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const value = db.client[prop as keyof PrismaClient];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(db.client);
    }
    return value;
  },
});
