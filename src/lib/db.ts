import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Check all possible env vars for a PostgreSQL connection string.
  // Explicitly skip any SQLite/file-based URLs — this app uses PostgreSQL only.
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
      "(DATABASE_URL is set to a SQLite path which is not supported — remove or replace it.)"
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/**
 * Lazy-initialized Prisma client.
 * Uses a getter so the client is only created when first accessed at runtime,
 * not during Next.js build-time static page generation.
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
 * Default export for convenience — use `prisma.job.findMany()` etc.
 * This is a Proxy that lazily initializes on first property access.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return db.client[prop as keyof PrismaClient];
  },
});
